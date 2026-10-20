"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function extendWarrantyAction(
  warrantyId: string,
  extensionMonths: number,
  reason: string
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const canOverride = session.role === "management" || session.role === "super_admin";
  if (!canOverride) {
    return { success: false, error: "Only Management or Super Admin can extend warranties." };
  }

  if (!reason.trim()) {
    return { success: false, error: "Reason is required to extend warranty." };
  }

  if (extensionMonths < 1 || extensionMonths > 36) {
    return { success: false, error: "Extension months must be between 1 and 36." };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const wRes = await client.query(
      `select id, unit_id, ends_on, months, status from svc.warranties where id = $1`,
      [warrantyId]
    );

    if (wRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Warranty record not found." };
    }

    const currentW = wRes.rows[0];

    // Compute new end date
    const updatedRes = await client.query(
      `update svc.warranties 
       set ends_on = (ends_on + ($1 || ' months')::interval)::date,
           months = months + $1,
           status = 'active',
           updated_at = now()
       where id = $2
       returning ends_on`,
      [extensionMonths, warrantyId]
    );

    const newEndsOn = updatedRes.rows[0].ends_on;

    // Audit log
    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('warranty.extend', 'svc.warranties', $1, $2, $3)`,
      [
        warrantyId,
        session.userId,
        JSON.stringify({
          extensionMonths,
          previousEndsOn: currentW.ends_on,
          newEndsOn,
          reason,
        }),
      ]
    );

    await client.query("COMMIT");
    revalidatePath("/service/warranties");
    return { success: true, newEndsOn };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("extendWarrantyAction error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function voidWarrantyAction(warrantyId: string, reason: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const canOverride = session.role === "management" || session.role === "super_admin";
  if (!canOverride) {
    return { success: false, error: "Only Management or Super Admin can void warranties." };
  }

  if (!reason.trim()) {
    return { success: false, error: "Reason is required to void warranty." };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const wRes = await client.query(
      `select id, status from svc.warranties where id = $1`,
      [warrantyId]
    );

    if (wRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Warranty record not found." };
    }

    await client.query(
      `update svc.warranties 
       set status = 'void', updated_at = now() 
       where id = $1`,
      [warrantyId]
    );

    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('warranty.void', 'svc.warranties', $1, $2, $3)`,
      [warrantyId, session.userId, JSON.stringify({ status: "void", reason })]
    );

    await client.query("COMMIT");
    revalidatePath("/service/warranties");
    return { success: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("voidWarrantyAction error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}
