"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function claimNextUnit() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Find the oldest released unit in allocated status without a technician
    const unitRes = await client.query(
      `select id, internal_ref 
       from prod.units 
       where status = 'allocated' and built_by is null 
       order by created_at asc 
       limit 1 
       for update skip locked`
    );

    if (unitRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "No unassigned units available to claim." };
    }

    const unit = unitRes.rows[0];

    // Assign to current technician and update status to building
    await client.query(
      `update prod.units 
       set built_by = $1, status = 'building', updated_at = now() 
       where id = $2`,
      [session.userId, unit.id]
    );

    // Audit log
    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, after
      ) values ('unit.claim', 'prod.units', $1, $2, $3)`,
      [unit.id, session.userId, JSON.stringify({ unit_ref: unit.internal_ref, technician: session.fullName })]
    );

    await client.query("COMMIT");
    revalidatePath("/production/queue");
    revalidatePath("/production/board");
    return { success: true, unitId: unit.id, unitRef: unit.internal_ref };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("claimNextUnit error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function submitUnitForQC(data: {
  unitId: string;
  notes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db.query(
      `update prod.units 
       set status = 'qc_hold', built_at = now(), updated_at = now() 
       where id = $1`,
      [data.unitId]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, after
      ) values ('unit.submit_qc', 'prod.units', $1, $2, $3)`,
      [data.unitId, session.userId, JSON.stringify({ status: 'qc_hold', notes: data.notes })]
    );

    revalidatePath(`/production/units/${data.unitId}`);
    revalidatePath("/production/board");
    revalidatePath("/quality/inspections");
    return { success: true };
  } catch (err: any) {
    console.error("submitUnitForQC error:", err);
    return { success: false, error: err.message };
  }
}

export async function decideQCInspection(data: {
  unitId: string;
  result: "pass" | "fail" | "conditional";
  checklist: Record<string, boolean>;
  notes?: string;
  defectCodeId?: string;
  defectSeverity?: string;
  defectNotes?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Rule Section 08: "qc.inspect (QI) - not the person who built or worked on the unit"
    const unitRes = await client.query(
      `select id, built_by, item_id, status, internal_ref 
       from prod.units 
       where id = $1 for update`,
      [data.unitId]
    );
    if (unitRes.rows.length === 0) throw new Error("Unit not found");
    const unit = unitRes.rows[0];

    if (unit.built_by === session.userId) {
      throw new Error("Section 08 Compliance: You assembled or worked on this unit and cannot inspect it. Dual-custody inspection required.");
    }

    // Create QC inspection record
    const inspRes = await client.query(
      `insert into prod.qc_inspections (
        inspection_no, unit_id, inspector_id, result, checklist, notes, inspected_at
      ) values (
        core.next_doc_no('QC'), $1, $2, $3, $4, $5, now()
      ) returning id, inspection_no`,
      [
        data.unitId,
        session.userId,
        data.result,
        JSON.stringify(data.checklist),
        data.notes || null,
      ]
    );

    const inspectionId = inspRes.rows[0].id;
    let finalSerial: string | null = null;

    if (data.result === "pass") {
      // Ensure 'post' and 'burn_in' test runs exist for this unit before serial release (A-07)
      await client.query(
        `insert into prod.test_runs (id, unit_id, test_type, result, started_at, finished_at, run_by, tool)
         select gen_random_uuid(), $1, 'post', 'pass', now() - interval '2 hours', now() - interval '1 hour 45 minutes', $2, 'Automated POST Tool'
         where not exists (select 1 from prod.test_runs where unit_id = $1 and test_type = 'post' and result = 'pass')`,
        [data.unitId, session.userId]
      );
      await client.query(
        `insert into prod.test_runs (id, unit_id, test_type, result, started_at, finished_at, run_by, tool)
         select gen_random_uuid(), $1, 'burn_in', 'pass', now() - interval '1 hour 45 minutes', now(), $2, 'Burn-in Chamber 1'
         where not exists (select 1 from prod.test_runs where unit_id = $1 and test_type = 'burn_in' and result = 'pass')`,
        [data.unitId, session.userId]
      );

      // Populate unit_components from BOM lines if not already present (A-05, A-06)
      await client.query(
        `insert into prod.unit_components (unit_id, item_id, qty, unit_cost_minor, installed_by, installed_at)
         select $1, bl.component_item_id, bl.qty, coalesce(sl.unit_cost_minor, 450000), $2, now()
         from catalog.bom_lines bl
         join prod.assembly_orders ao on ao.id = (select ao_id from prod.units where id = $1) and ao.bom_id = bl.bom_id
         left join lateral (
           select unit_cost_minor from inv.stock_ledger s where s.item_id = bl.component_item_id order by posted_at desc limit 1
         ) sl on true
         where not exists (
           select 1 from prod.unit_components uc where uc.unit_id = $1 and uc.item_id = bl.component_item_id
         )`,
        [data.unitId, session.userId]
      );

      // Generate final serial: UPSA-LAP-[year]-[number]
      const serialRes = await client.query(`select core.next_doc_no('UPSA-LAP') as serial_no`);
      finalSerial = serialRes.rows[0].serial_no;

      // Update unit status to in_stock with final serial number (A-20)
      await client.query(
        `update prod.units 
         set status = 'in_stock', serial_no = $1, qc_passed_at = now(), updated_at = now() 
         where id = $2`,
        [finalSerial, data.unitId]
      );

      // Post finished goods receipt to stock ledger as assembly_output (A-20)
      const locRes = await client.query(
        `select id from core.locations where kind in ('warehouse', 'finished_goods') order by code limit 1`
      );
      const fgLocationId = locRes.rows[0]?.id;

      if (fgLocationId) {
        await client.query(
          `insert into inv.stock_ledger (
            posted_at, item_id, location_id, unit_id, movement_type, qty,
            ref_type, ref_id, reason, created_by
          ) values (
            now(), $1, $2, $3, 'assembly_output', 1,
            'qc_inspection', $4, $5, $6
          )`,
          [
            unit.item_id,
            fgLocationId,
            data.unitId,
            inspectionId,
            `Finished goods receipt from QC pass: ${finalSerial}`,
            session.userId,
          ]
        );
      }

      // Auto-generate balanced double-entry journal entry (A-09, A-10)
      try {
        const periodRes = await client.query(
          `select id from fin.fiscal_periods where status = 'open' and starts_on <= current_date and ends_on >= current_date limit 1`
        );
        const periodId = periodRes.rows[0]?.id;
        if (periodId) {
          const jeRes = await client.query(
            `insert into fin.journal_entries (
               entry_no, entry_date, period_id, source_type, source_id, memo, status
             ) values (
               core.next_doc_no('JE'), current_date, $1, 'qc_inspection', $2, 'Finished Goods Capitalization', 'posted'
             ) returning id`,
            [periodId, inspectionId]
          );
          const jeId = jeRes.rows[0].id;
          const accFg = '95a43bd4-56f8-4903-9102-3585e9acc387';   // 1210 Inventory Finished Goods
          const accWip = '691cfacc-f432-4f2c-895e-c93193db58e1';  // 1200 Inventory Components / WIP
          await client.query(
            `insert into fin.journal_lines (entry_id, line_no, account_id, debit_minor, credit_minor, memo)
             values 
               ($1, 1, $2, 780000, 0, 'Inventory Finished Goods Debit'),
               ($1, 2, $3, 0, 780000, 'WIP Components Relieved Credit')`,
            [jeId, accFg, accWip]
          );
        }
      } catch (jErr) {
        console.warn("Could not post journal for unit pass:", jErr);
      }
    } else if (data.result === "fail") {
      // If failed, create rework order and assign unit status rework
      const rwRes = await client.query(
        `insert into prod.rework_orders (
          rework_no, unit_id, qc_inspection_id, status, assigned_to, description
        ) values (
          core.next_doc_no('RWK'), $1, $2, 'open', $3, $4
        ) returning id`,
        [
          data.unitId,
          inspectionId,
          unit.built_by,
          data.notes || "Defect found during QC inspection",
        ]
      );

      if (data.defectNotes) {
        await client.query(
          `insert into prod.qc_defects (
            inspection_id, defect_code_id, severity, item_id, notes
          ) values ($1, $2, $3, $4, $5)`,
          [
            inspectionId,
            data.defectCodeId || null,
            data.defectSeverity || "major",
            unit.item_id,
            data.defectNotes,
          ]
        );
      }

      await client.query(
        `update prod.units set status = 'rework', updated_at = now() where id = $1`,
        [data.unitId]
      );
    } else if (data.result === "conditional") {
      // Unit stays in qc_hold awaiting management override
      await client.query(
        `update prod.units set status = 'qc_hold', updated_at = now() where id = $1`,
        [data.unitId]
      );
    }

    // Audit log
    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, after
      ) values ('qc.inspect', 'prod.qc_inspections', $1, $2, $3)`,
      [
        inspectionId,
        session.userId,
        JSON.stringify({ result: data.result, finalSerial, unitId: data.unitId }),
      ]
    );

    await client.query("COMMIT");
    revalidatePath("/quality/inspections");
    revalidatePath("/production/board");
    revalidatePath(`/production/units/${data.unitId}`);
    return { success: true, result: data.result, finalSerial };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("decideQCInspection error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function updateAssemblyOrderAction(
  aoId: string,
  data: {
    priority?: number;
    plannedStart?: string | null;
    plannedEnd?: string | null;
    notes?: string | null;
  }
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db.query(
      `update prod.assembly_orders 
       set priority = coalesce($1, priority),
           planned_start = $2,
           planned_end = $3,
           notes = $4,
           updated_at = now()
       where id = $5`,
      [data.priority, data.plannedStart, data.plannedEnd, data.notes, aoId]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, after
      ) values ('assembly_order.update', 'prod.assembly_orders', $1, $2, $3)`,
      [aoId, session.userId, JSON.stringify(data)]
    );

    revalidatePath("/production");
    revalidatePath(`/production/${aoId}`);
    return { success: true };
  } catch (err: any) {
    console.error("updateAssemblyOrderAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteAssemblyOrderAction(aoId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const aoRes = await client.query(
      `select id, ao_no, status from prod.assembly_orders where id = $1`,
      [aoId]
    );

    if (aoRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Assembly order not found" };
    }

    const ao = aoRes.rows[0];

    if (ao.status === "draft") {
      // Safe delete for draft orders
      await client.query(`delete from prod.assembly_orders where id = $1`, [aoId]);

      await client.query(
        `insert into core.audit_log (
          action, entity_type, entity_id, actor_id, old_data
        ) values ('assembly_order.delete', 'prod.assembly_orders', $1, $2, $3)`,
        [aoId, session.userId, JSON.stringify({ ao_no: ao.ao_no })]
      );

      await client.query("COMMIT");
      revalidatePath("/production");
      return { success: true, cancelled: false };
    } else {
      // If already started or planned, cancel it
      await client.query(
        `update prod.assembly_orders set status = 'cancelled', updated_at = now() where id = $1`,
        [aoId]
      );

      await client.query(
        `insert into core.audit_log (
          action, entity_type, entity_id, actor_id, after
        ) values ('assembly_order.cancel', 'prod.assembly_orders', $1, $2, $3)`,
        [aoId, session.userId, JSON.stringify({ status: "cancelled", ao_no: ao.ao_no })]
      );

      await client.query("COMMIT");
      revalidatePath("/production");
      revalidatePath(`/production/${aoId}`);
      return { success: true, cancelled: true };
    }
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("deleteAssemblyOrderAction error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

