"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAnyScope } from "@/lib/session";
import { z } from "zod";

const AddGrnLineSchema = z
  .object({
    grnId: z.string().uuid("Invalid GRN identifier"),
    itemId: z.string().uuid("Please select a valid item"),
    lotNo: z.string().max(100).optional().nullable(),
    qtyReceived: z.coerce.number().positive("Received quantity must be positive"),
    qtyAccepted: z.coerce.number().min(0, "Accepted quantity cannot be negative"),
    qtyRejected: z.coerce.number().min(0, "Rejected quantity cannot be negative"),
  })
  .refine(
    (data) => Math.abs(data.qtyReceived - (data.qtyAccepted + data.qtyRejected)) <= 0.0001,
    {
      message: "Received quantity must equal Accepted + Rejected quantities.",
      path: ["qtyReceived"],
    }
  );

const PostGrnSchema = z.object({
  grnId: z.string().uuid("Invalid GRN identifier"),
});

export async function addGrnLineAction(formData: FormData) {
  await requireAnyScope(["inventory.receive", "procurement.write"]);

  const parsed = AddGrnLineSchema.safeParse({
    grnId: formData.get("grn_id"),
    itemId: formData.get("item_id"),
    lotNo: formData.get("lot_no")?.toString() || null,
    qtyReceived: formData.get("qty_received"),
    qtyAccepted: formData.get("qty_accepted"),
    qtyRejected: formData.get("qty_rejected"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Validation failed");
  }

  const { grnId, itemId, lotNo, qtyReceived, qtyAccepted, qtyRejected } = parsed.data;

  try {
    await db.query(
      `
      insert into proc.goods_receipt_lines (
        grn_id, item_id, qty_received, qty_accepted, qty_rejected, lot_no
      ) 
      values ($1, $2, $3, $4, $5, $6)
      `,
      [grnId, itemId, qtyReceived, qtyAccepted, qtyRejected, lotNo]
    );

    revalidatePath(`/procurement/grn/${grnId}`);
  } catch (error: any) {
    console.error("Error adding GRN line:", error);
    throw new Error(error.message || "Failed to add item to receipt.");
  }
}

export async function postGrnAction(formData: FormData) {
  const session = await requireAnyScope(["inventory.receive", "procurement.write"]);

  const parsed = PostGrnSchema.safeParse({
    grnId: formData.get("grn_id"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Validation failed");
  }

  const { grnId } = parsed.data;

  try {
    await db.query(`select inv.post_goods_receipt($1, $2)`, [grnId, session.userId]);
    revalidatePath(`/procurement/grn/${grnId}`);
  } catch (error: any) {
    console.error("Error posting GRN:", error);
    throw new Error(error.message || "Failed to post GRN.");
  }
}
