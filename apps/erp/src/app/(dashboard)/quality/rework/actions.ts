"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function startReworkAction(reworkId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const reworkRes = await client.query(
      `select id, unit_id, status from prod.rework_orders where id = $1`,
      [reworkId]
    );

    if (reworkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Rework order not found" };
    }

    const rework = reworkRes.rows[0];
    if (rework.status !== "open") {
      await client.query("ROLLBACK");
      return { success: false, error: `Cannot start rework in '${rework.status}' status` };
    }

    await client.query(
      `update prod.rework_orders 
       set status = 'in_progress', assigned_to = coalesce(assigned_to, $1), updated_at = now() 
       where id = $2`,
      [session.userId, reworkId]
    );

    await client.query(
      `update prod.units set status = 'rework', updated_at = now() where id = $1`,
      [rework.unit_id]
    );

    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('rework.start', 'prod.rework_orders', $1, $2, $3)`,
      [reworkId, session.userId, JSON.stringify({ status: "in_progress", technician: session.fullName })]
    );

    await client.query("COMMIT");
    revalidatePath("/quality/rework");
    revalidatePath("/production/board");
    revalidatePath(`/production/units/${rework.unit_id}`);
    return { success: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("startReworkAction error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function markReworkFixedAction(reworkId: string, notes?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const reworkRes = await client.query(
      `select r.id, r.unit_id, r.rework_no, r.status, u.internal_ref 
       from prod.rework_orders r
       join prod.units u on u.id = r.unit_id
       where r.id = $1`,
      [reworkId]
    );

    if (reworkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Rework order not found" };
    }

    const rework = reworkRes.rows[0];
    if (rework.status !== "in_progress" && rework.status !== "open") {
      await client.query("ROLLBACK");
      return { success: false, error: `Cannot mark fixed from '${rework.status}' status` };
    }

    // Set rework order to done
    await client.query(
      `update prod.rework_orders 
       set status = 'done', resolved_at = now(), updated_at = now(),
           description = case when $1::text is not null then description || E'\n[Fixed]: ' || $1::text else description end
       where id = $2`,
      [notes || null, reworkId]
    );

    // Return unit to testing per Section 08 workflow
    await client.query(
      `update prod.units set status = 'testing', updated_at = now() where id = $1`,
      [rework.unit_id]
    );

    // Write audit log
    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('rework.fixed', 'prod.rework_orders', $1, $2, $3)`,
      [reworkId, session.userId, JSON.stringify({ status: "done", unit_ref: rework.internal_ref, notes })]
    );

    // Notify QC team [N] QI
    const qcUsers = await client.query(
      `select u.id from core.profiles u
       join core.user_roles ur on ur.user_id = u.id
       join core.roles r on r.id = ur.role_id
       where r.code in ('qc_inspector', 'super_admin', 'management')
       limit 10`
    );

    for (const row of qcUsers.rows) {
      await client.query(
        `insert into core.notifications (
          user_id, title, body, link
        ) values ($1, $2, $3, $4)`,
        [
          row.id,
          `Rework Completed: ${rework.internal_ref}`,
          `Unit ${rework.internal_ref} rework has been marked fixed by ${session.fullName}. Unit returned to testing and awaiting re-inspection.`,
          `/quality/inspections`,
        ]
      );
    }

    await client.query("COMMIT");
    revalidatePath("/quality/rework");
    revalidatePath("/quality/inspections");
    revalidatePath("/production/board");
    revalidatePath(`/production/units/${rework.unit_id}`);
    return { success: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("markReworkFixedAction error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function cancelReworkAction(reworkId: string, reason: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (!reason.trim()) {
    return { success: false, error: "Cancellation reason is required" };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const reworkRes = await client.query(
      `select id, unit_id, status from prod.rework_orders where id = $1`,
      [reworkId]
    );

    if (reworkRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Rework order not found" };
    }

    const rework = reworkRes.rows[0];

    await client.query(
      `update prod.rework_orders 
       set status = 'cancelled', updated_at = now(),
           description = description || E'\n[Cancelled by ' || $1 || E']: ' || $2
       where id = $3`,
      [session.fullName, reason, reworkId]
    );

    // Put unit on qc_hold for reassignment or scrap disposition
    await client.query(
      `update prod.units set status = 'qc_hold', updated_at = now() where id = $1`,
      [rework.unit_id]
    );

    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('rework.cancel', 'prod.rework_orders', $1, $2, $3)`,
      [reworkId, session.userId, JSON.stringify({ status: "cancelled", reason })]
    );

    await client.query("COMMIT");
    revalidatePath("/quality/rework");
    revalidatePath("/production/board");
    return { success: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("cancelReworkAction error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}
