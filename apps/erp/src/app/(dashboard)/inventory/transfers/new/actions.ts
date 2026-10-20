"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";
import { z } from "zod";

const CreateTransferSchema = z
  .object({
    fromLocationId: z.string().uuid("Please select a valid source location"),
    toLocationId: z.string().uuid("Please select a valid destination location"),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine((data) => data.fromLocationId !== data.toLocationId, {
    message: "Source and destination locations cannot be the same.",
  });

export async function createTransferAction(prevState: any, formData: FormData) {
  const session = await requireAnyScope(["inventory.issue", "inventory.receive"]);

  const parsed = CreateTransferSchema.safeParse({
    fromLocationId: formData.get("from_location_id"),
    toLocationId: formData.get("to_location_id"),
    notes: formData.get("notes")?.toString() || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const { fromLocationId, toLocationId, notes } = parsed.data;

  let transferId: string;
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `insert into inv.transfers (
         transfer_no, from_location_id, to_location_id, status, notes
       ) 
       values (
         core.next_doc_no('TRF'),
         $1, $2, 'draft', $3
       ) returning id, transfer_no`,
      [fromLocationId, toLocationId, notes]
    );
    transferId = result.rows[0].id;
    const transferNo = result.rows[0].transfer_no;

    await client.query(
      `insert into core.audit_log (actor_id, action, entity_type, entity_id, after)
       values ($1, 'CREATE_TRANSFER', 'inv.transfers', $2, $3::jsonb)`,
      [session.userId, transferId, JSON.stringify({ transfer_no: transferNo, fromLocationId, toLocationId })]
    );

    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Transfer creation error:", error);
    return { error: error.message || "Failed to create transfer." };
  } finally {
    client.release();
  }

  redirect(`/inventory/transfers/${transferId}`);
}
