"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";
import { z } from "zod";

const POLineSchema = z.object({
  itemId: z.string().uuid("Please select a valid component SKU"),
  qty: z.coerce.number().positive("Quantity must be greater than zero"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  description: z.string().max(255).optional().nullable(),
});

const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().uuid("Please select a valid supplier"),
  currency: z.string().min(3).max(3).default("GHS"),
  incoterm: z.string().max(10).default("FOB"),
  shippingMode: z.string().max(20).default("sea"),
  expectedArrival: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  lines: z.array(POLineSchema).min(1, "At least one line item is required to issue a purchase order."),
});

export async function createPurchaseOrderAction(prevState: any, formData: FormData) {
  await requireAnyScope(["procurement.write"]);

  let rawLines: any[] = [];
  try {
    const raw = formData.get("lines_json")?.toString();
    if (raw) {
      rawLines = JSON.parse(raw);
    }
  } catch {
    return { error: "Invalid line items payload." };
  }

  const parsed = CreatePurchaseOrderSchema.safeParse({
    supplierId: formData.get("supplier_id"),
    currency: formData.get("currency") || "GHS",
    incoterm: formData.get("incoterm") || "FOB",
    shippingMode: formData.get("shipping_mode") || "sea",
    expectedArrival: formData.get("expected_arrival")?.toString() || null,
    notes: formData.get("notes")?.toString() || null,
    lines: rawLines,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const { supplierId, currency, incoterm, shippingMode, expectedArrival, notes, lines } = parsed.data;

  let poId: string;
  const client = await db.connect();
  try {
    await client.query("BEGIN");

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

    const poRes = await client.query(
      `insert into proc.purchase_orders (
         po_no, supplier_id, currency, fx_rate, incoterm, shipping_mode, 
         expected_arrival_date, subtotal_minor, total_minor, status, notes
       ) 
       values (
         core.next_doc_no('PO'), $1, $2, 1.0, $3, $4, 
         $5, $6, $6, 'draft', $7
       )
       returning id`,
      [
        supplierId,
        currency,
        incoterm,
        shippingMode,
        expectedArrival,
        totalMinor.toString(),
        notes || null,
      ]
    );

    poId = poRes.rows[0].id;

    for (const cl of calculatedLines) {
      await client.query(
        `insert into proc.purchase_order_lines (
           po_id, line_no, item_id, description, qty, 
           unit_price_minor, line_total_minor, expected_date
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          poId,
          cl.lineNo,
          cl.itemId,
          cl.description,
          cl.qty,
          cl.unitPriceMinor.toString(),
          cl.lineTotalMinor.toString(),
          expectedArrival,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Failed to create purchase order:", error);
    return { error: error.message || "Failed to create purchase order." };
  } finally {
    client.release();
  }

  redirect(`/procurement/${poId}`);
}
