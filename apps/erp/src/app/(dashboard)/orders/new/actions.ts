"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";
import { z } from "zod";

const OrderLineSchema = z.object({
  itemId: z.string().uuid("Please select a valid item"),
  qty: z.coerce.number().positive("Quantity must be greater than zero"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  description: z.string().max(255).optional().nullable(),
});

const CreateInternalOrderSchema = z.object({
  accountId: z.string().uuid("Please select a valid customer account"),
  deliveryPoint: z.string().max(255).optional().nullable(),
  requiredBy: z.string().min(1, "Required-by date is mandatory"),
  notes: z.string().max(1000).optional().nullable(),
  lines: z.array(OrderLineSchema).min(1, "At least one line item is required"),
});

export async function createInternalOrderAction(prevState: any, formData: FormData) {
  const session = await requireAnyScope(["orders.write"]);

  let rawLines: any[] = [];
  try {
    const raw = formData.get("lines_json")?.toString();
    if (raw) {
      rawLines = JSON.parse(raw);
    }
  } catch {
    return { error: "Invalid line items payload." };
  }

  const parsed = CreateInternalOrderSchema.safeParse({
    accountId: formData.get("account_id"),
    deliveryPoint: formData.get("delivery_point")?.toString() || null,
    requiredBy: formData.get("required_by"),
    notes: formData.get("notes")?.toString() || null,
    lines: rawLines,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const { accountId, deliveryPoint, requiredBy, notes, lines } = parsed.data;

  let orderId: string;
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Calculate total minor units
    let totalMinor = BigInt(0);
    const calculatedLines = lines.map((l, idx) => {
      const priceMinor = BigInt(Math.round(Number(l.unitPrice) * 100));
      const lineQty = Number(l.qty);
      const lineTotalMinor = priceMinor * BigInt(Math.round(lineQty));
      totalMinor += lineTotalMinor;
      return {
        lineNo: idx + 1,
        itemId: l.itemId,
        description: l.description || null,
        qty: lineQty,
        unitPriceMinor: priceMinor,
        lineTotalMinor,
      };
    });

    const orderRes = await client.query(
      `insert into sales.internal_orders (
         order_no, account_id, requested_by_name, delivery_point, 
         required_by, status, subtotal_minor, total_minor, notes
       )
       values (
         core.next_doc_no('ORD'), $1, $2, $3, $4, 'draft', $5, $5, $6
       )
       returning id`,
      [
        accountId,
        session.fullName || "Internal User",
        deliveryPoint || null,
        requiredBy,
        totalMinor.toString(),
        notes || null,
      ]
    );

    orderId = orderRes.rows[0].id;

    for (const cl of calculatedLines) {
      await client.query(
        `insert into sales.internal_order_lines (
           order_id, line_no, item_id, description, qty, 
           unit_price_minor, line_total_minor
         )
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orderId,
          cl.lineNo,
          cl.itemId,
          cl.description,
          cl.qty,
          cl.unitPriceMinor.toString(),
          cl.lineTotalMinor.toString(),
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error creating internal order:", error);
    if (error.code === "23503") {
      return { error: "Invalid customer account or item reference." };
    }
    return { error: error.message || "Failed to create internal order." };
  } finally {
    client.release();
  }

  redirect(`/orders/${orderId}`);
}
