"use server";

import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ReleaseAoSchema = z.object({
  aoId: z.string().uuid("Invalid assembly order ID"),
});

export async function releaseAssemblyOrderAction(aoId: string) {
  const session = await requireAnyScope(["production.plan", "production.work"]);

  const parsed = ReleaseAoSchema.safeParse({ aoId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(`select prod.release_assembly_order($1)`, [parsed.data.aoId]);

    await client.query(
      `insert into core.audit_log (actor_id, action, entity_type, entity_id, after)
       values ($1, 'RELEASE_AO', 'prod.assembly_orders', $2, $3::jsonb)`,
      [session.userId, parsed.data.aoId, JSON.stringify({ action: "released" })]
    );

    await client.query("COMMIT");
    revalidatePath("/production");
    revalidatePath(`/production/${parsed.data.aoId}`);
    return { success: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Failed to release assembly order:", err);
    return { error: err.message || "Failed to release assembly order." };
  } finally {
    client.release();
  }
}
