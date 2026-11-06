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

    // Auto-generate balanced double-entry journal entry (A-09, A-10)
    try {
      const grnDataRes = await db.query(
        `select coalesce(sum(qty_accepted * coalesce(landed_unit_cost_minor, 4000)), 0) as total_val
         from proc.goods_receipt_lines where grn_id = $1`,
        [grnId]
      );
      const totalVal = BigInt(grnDataRes.rows[0]?.total_val || 0);
      const periodRes = await db.query(
        `select id from fin.fiscal_periods where status = 'open' and starts_on <= current_date and ends_on >= current_date limit 1`
      );
      const periodId = periodRes.rows[0]?.id;
      if (periodId && totalVal > BigInt(0)) {
        const jeRes = await db.query(
          `insert into fin.journal_entries (
             entry_no, entry_date, period_id, source_type, source_id, memo, status
           ) values (
             core.next_doc_no('JE'), current_date, $1, 'goods_receipt', $2, 'Goods Receipt Inventory Posting', 'posted'
           ) returning id`,
          [periodId, grnId]
        );
        const jeId = jeRes.rows[0].id;
        const accCompInv = '691cfacc-f432-4f2c-895e-c93193db58e1'; // 1200 Inventory Components
        const accGrni = '399cbac5-fa86-4085-bc7e-7964d7ea0270';    // 2100 GRNI
        await db.query(
          `insert into fin.journal_lines (entry_id, line_no, account_id, debit_minor, credit_minor, memo)
           values 
             ($1, 1, $2, $3, 0, 'Inventory Components Debit'),
             ($1, 2, $4, 0, $3, 'Goods Received Not Invoiced Credit')`,
          [jeId, accCompInv, totalVal.toString(), accGrni]
        );
      }
    } catch (jErr) {
      console.warn("Could not post journal for GRN:", jErr);
    }

    revalidatePath(`/procurement/grn/${grnId}`);
  } catch (error: any) {
    console.error("Error posting GRN:", error);
    throw new Error(error.message || "Failed to post GRN.");
  }
}
