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

    // Auto-generate balanced double-entry journal entry (A-09, A-10)
    if (kind !== "proforma" && totalMinor > BigInt(0)) {
      const periodRes = await client.query(
        `select id from fin.fiscal_periods where status = 'open' and starts_on <= current_date and ends_on >= current_date limit 1`
      );
      const periodId = periodRes.rows[0]?.id;
      if (periodId) {
        const jeRes = await client.query(
          `insert into fin.journal_entries (
             entry_no, entry_date, period_id, source_type, source_id, memo, status
           ) values (
             core.next_doc_no('JE'), current_date, $1, 'invoice', $2, 'Customer Tax Invoice Posting', 'posted'
           ) returning id`,
          [periodId, invoiceId]
        );
        const jeId = jeRes.rows[0].id;
        const accAr = 'e10215c8-1a61-4365-abcb-f16d88180a90'; // 1100 Accounts Receivable
        const accRev = '12e96eb4-f97b-4b15-9aea-0d64aaca2e11'; // 4000 Sales Revenue
        await client.query(
          `insert into fin.journal_lines (entry_id, line_no, account_id, debit_minor, credit_minor, memo)
           values 
             ($1, 1, $2, $3, 0, 'Accounts Receivable Debit'),
             ($1, 2, $4, 0, $3, 'Internal Sales Revenue Credit')`,
          [jeId, accAr, totalMinor.toString(), accRev]
        );
      }
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
