"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";
import { z } from "zod";

const InvoiceLineSchema = z.object({
  itemId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, "Description is required").max(255),
  qty: z.coerce.number().positive("Quantity must be greater than zero"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
});

const CreateInvoiceSchema = z.object({
  accountId: z.string().uuid("Please select a valid customer account"),
  kind: z.enum(["commercial", "proforma", "credit_note", "debit_note"]),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().min(3).max(3).default("GHS"),
  notes: z.string().max(1000).optional().nullable(),
  lines: z.array(InvoiceLineSchema).min(1, "At least one line item is required to generate an invoice."),
});

export async function createInvoiceAction(prevState: any, formData: FormData) {
  await requireAnyScope(["invoices.write"]);

  let rawLines: any[] = [];
  try {
    const raw = formData.get("lines_json")?.toString();
    if (raw) {
      rawLines = JSON.parse(raw);
    }
  } catch {
    return { error: "Invalid line items payload." };
  }

  const parsed = CreateInvoiceSchema.safeParse({
    accountId: formData.get("account_id"),
    kind: formData.get("kind"),
    dueDate: formData.get("due_date"),
    currency: formData.get("currency") || "GHS",
    notes: formData.get("notes")?.toString() || null,
    lines: rawLines,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const { accountId, kind, dueDate, currency, notes, lines } = parsed.data;

  let invoiceId: string;
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
        itemId: l.itemId || null,
        description: l.description || "General billing",
        qty: lineQty,
        unitPriceMinor: priceMinor,
        lineTotalMinor,
      };
    });

    const invRes = await client.query(
      `insert into fin.invoices (
         invoice_no, account_id, kind, status, issue_date, 
         due_date, currency, subtotal_minor, total_minor, notes
       )
       values (
         core.next_doc_no('INV'), $1, $2, 'issued', current_date, 
         $3, $4, $5, $5, $6
       )
       returning id`,
      [
        accountId,
        kind,
        dueDate,
        currency,
        totalMinor.toString(),
        notes || null,
      ]
    );

    invoiceId = invRes.rows[0].id;

    for (const cl of calculatedLines) {
      await client.query(
        `insert into fin.invoice_lines (
           invoice_id, line_no, item_id, description, qty, 
           unit_price_minor, line_total_minor
         )
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          invoiceId,
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
    console.error("Error creating invoice:", error);
    if (error.code === "23503") {
      return { error: "Invalid customer account or item reference." };
    }
    return { error: error.message || "Failed to create invoice." };
  } finally {
    client.release();
  }

  redirect(`/finance/invoices/${invoiceId}`);
}
