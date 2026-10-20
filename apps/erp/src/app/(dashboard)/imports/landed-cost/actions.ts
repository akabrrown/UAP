"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createLandedCostRun(shipmentId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Fetch shipment and lines
    const shpRes = await client.query(
      `select id, shipment_no from proc.shipments where id = $1`,
      [shipmentId]
    );
    if (shpRes.rows.length === 0) throw new Error("Shipment not found");
    const shipment = shpRes.rows[0];

    // Create landed cost run
    const runRes = await client.query(
      `insert into proc.landed_cost_runs (
        run_no, shipment_id, status, total_allocated_minor, notes
      ) values (
        core.next_doc_no('LCR'), $1, 'draft', 0, $2
      ) returning id, run_no`,
      [shipmentId, `Landed cost run for shipment ${shipment.shipment_no}`]
    );

    const runId = runRes.rows[0].id;

    // Fetch lines and charges
    const linesRes = await client.query(
      `select id, item_id, qty_shipped, unit_value_minor from proc.shipment_lines where shipment_id = $1`,
      [shipmentId]
    );

    const chargesRes = await client.query(
      `select id, amount_base_minor, allocation_basis from proc.shipment_charges where shipment_id = $1`,
      [shipmentId]
    );

    let totalGoodsValue = BigInt(0);
    for (const l of linesRes.rows) {
      totalGoodsValue += BigInt(l.unit_value_minor) * BigInt(Math.round(Number(l.qty_shipped)));
    }

    let totalAllocatedMinor = BigInt(0);

    for (const charge of chargesRes.rows) {
      const chargeMinor = BigInt(charge.amount_base_minor || 0);
      totalAllocatedMinor += chargeMinor;

      for (const line of linesRes.rows) {
        const lineVal = BigInt(line.unit_value_minor) * BigInt(Math.round(Number(line.qty_shipped)));
        const sharePct = totalGoodsValue > 0 ? Number(lineVal) / Number(totalGoodsValue) : 1 / linesRes.rows.length;
        const lineChargeShare = BigInt(Math.round(Number(chargeMinor) * sharePct));

        await client.query(
          `insert into proc.landed_cost_allocations (
            run_id, charge_id, basis, basis_value, share_pct, amount_minor
          ) values ($1, $2, $3, $4, $5, $6)`,
          [
            runId,
            charge.id,
            charge.allocation_basis || "value",
            lineVal.toString(),
            (sharePct * 100).toFixed(4),
            lineChargeShare.toString(),
          ]
        );
      }
    }

    await client.query(
      `update proc.landed_cost_runs set total_allocated_minor = $1 where id = $2`,
      [totalAllocatedMinor.toString(), runId]
    );

    // Audit log
    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('landed_cost.create', 'proc.landed_cost_runs', $1, $2, $3)`,
      [runId, session.userId, JSON.stringify({ run_no: runRes.rows[0].run_no, shipment_id: shipmentId })]
    );

    await client.query("COMMIT");
    revalidatePath("/imports/landed-cost");
    return { success: true, runId };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("createLandedCostRun error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function postLandedCostRun(runId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const runRes = await client.query(
      `select id, shipment_id, status from proc.landed_cost_runs where id = $1 for update`,
      [runId]
    );
    if (runRes.rows.length === 0) throw new Error("Run not found");
    if (runRes.rows[0].status === "posted") throw new Error("Run already posted");

    const shipmentId = runRes.rows[0].shipment_id;

    // Update status to posted
    await client.query(
      `update proc.landed_cost_runs 
       set status = 'posted', posted_by = $1, posted_at = now(), updated_at = now() 
       where id = $2`,
      [session.userId, runId]
    );

    // Update item cost history for lines
    const lines = await client.query(`
      select 
        sl.item_id,
        sl.qty_shipped,
        sl.unit_value_minor,
        coalesce(sum(lca.amount_minor), 0) as total_charge_share
      from proc.shipment_lines sl
      left join proc.landed_cost_allocations lca on lca.run_id = $1
      where sl.shipment_id = $2
      group by sl.item_id, sl.qty_shipped, sl.unit_value_minor
    `, [runId, shipmentId]);

    for (const l of lines.rows) {
      const qty = Number(l.qty_shipped);
      const goodsTotalMinor = Number(l.unit_value_minor) * qty;
      const chargeTotalMinor = Number(l.total_charge_share);
      const newLandedUnitCostMinor = Math.round((goodsTotalMinor + chargeTotalMinor) / (qty || 1));

      // Append to item cost history
      await client.query(
        `insert into inv.item_cost_history (
          item_id, effective_from, old_cost_minor, new_cost_minor,
          change_reason, ref_type, ref_id, changed_by
        ) values (
          $1, now(), $2, $3, 'landed_cost_posting', 'proc.landed_cost_runs', $4, $5
        )`,
        [
          l.item_id,
          l.unit_value_minor,
          newLandedUnitCostMinor,
          runId,
          session.userId,
        ]
      );
    }

    // Audit log
    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('landed_cost.post', 'proc.landed_cost_runs', $1, $2, $3)`,
      [runId, session.userId, JSON.stringify({ runId, status: 'posted' })]
    );

    await client.query("COMMIT");
    revalidatePath("/imports/landed-cost");
    revalidatePath(`/imports/landed-cost/${runId}`);
    return { success: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("postLandedCostRun error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function reverseLandedCostRun(runId: string, reason: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `update proc.landed_cost_runs 
       set status = 'reversed', reversed_by = $1, reversed_at = now(), notes = coalesce(notes, '') || ' [Reversal: ' || $2 || ']'
       where id = $3`,
      [session.userId, reason, runId]
    );

    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('landed_cost.reverse', 'proc.landed_cost_runs', $1, $2, $3)`,
      [runId, session.userId, JSON.stringify({ reason })]
    );

    await client.query("COMMIT");
    revalidatePath("/imports/landed-cost");
    revalidatePath(`/imports/landed-cost/${runId}`);
    return { success: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("reverseLandedCostRun error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}
