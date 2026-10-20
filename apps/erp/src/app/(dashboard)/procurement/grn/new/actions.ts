"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateGrnSchema = z.object({
  supplierId: z.string().uuid("Please select a valid supplier").optional().nullable(),
  locationId: z.string().uuid("Receiving location is required"),
  deliveryNoteNo: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function createGrnAction(formData: FormData) {
  const session = await requireAnyScope(["inventory.receive", "procurement.write"]);

  const parsed = CreateGrnSchema.safeParse({
    supplierId: formData.get("supplier_id")?.toString() || null,
    locationId: formData.get("location_id"),
    deliveryNoteNo: formData.get("delivery_note_no")?.toString() || null,
    notes: formData.get("notes")?.toString() || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Validation failed");
  }

  const { supplierId, locationId, deliveryNoteNo, notes } = parsed.data;

  let grnId: string;
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      insert into proc.goods_receipts (
        grn_no, supplier_id, location_id, received_by, received_at, delivery_note_no, notes
      ) 
      values (
        core.next_doc_no('GRN'),
        $1, $2, $3, now(), $4, $5
      )
      returning id, grn_no
      `,
      [supplierId, locationId, session.userId, deliveryNoteNo, notes]
    );
    
    grnId = result.rows[0].id;
    const grnNo = result.rows[0].grn_no;

    await client.query(
      `insert into core.audit_log (actor_id, action, entity_type, entity_id, after)
       values ($1, 'CREATE_GRN', 'proc.goods_receipts', $2, $3::jsonb)`,
      [session.userId, grnId, JSON.stringify({ grn_no: grnNo, supplier_id: supplierId, location_id: locationId })]
    );

    await client.query("COMMIT");
    revalidatePath("/procurement/grn");
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error creating GRN:", error);
    throw new Error(error.message || "Failed to create GRN.");
  } finally {
    client.release();
  }

  redirect(`/procurement/grn/${grnId}`);
}
