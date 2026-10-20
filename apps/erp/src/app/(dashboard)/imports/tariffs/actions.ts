"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function addTariff(data: {
  hsCode: string;
  description: string;
  dutyPct: number;
  vatPct?: number;
  effectiveFrom: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    const res = await db.query(
      `insert into catalog.customs_tariffs (
        hs_code, description, duty_pct, vat_pct, levies, effective_from
      ) values ($1, $2, $3, $4, '{}'::jsonb, $5)
      returning id`,
      [
        data.hsCode,
        data.description,
        data.dutyPct,
        data.vatPct || 15.0,
        data.effectiveFrom || new Date().toISOString().split("T")[0],
      ]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('tariff.create', 'catalog.customs_tariffs', $1, $2, $3)`,
      [res.rows[0].id, session.userId, JSON.stringify(data)]
    );

    revalidatePath("/imports/tariffs");
    return { success: true };
  } catch (err: any) {
    console.error("addTariff error:", err);
    return { success: false, error: err.message };
  }
}
