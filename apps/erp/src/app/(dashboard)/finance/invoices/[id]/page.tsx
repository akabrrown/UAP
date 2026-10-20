import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, Receipt, DollarSign, FileCheck } from "lucide-react";
import { requireAnyScope } from "@/lib/session";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyScope(["invoices.write", "payments.write", "gl.read", "expenses.submit", "budgets.write"]);
  const { id } = await params;

  const invRes = await db.query(
    `select i.*, a.name as customer_name, a.account_no
     from fin.invoices i
     join core.customer_accounts a on a.id = i.account_id
     where i.id = $1`,
    [id]
  );

  const invoice = invRes.rows[0];
  if (!invoice) {
    notFound();
  }

  const linesRes = await db.query(
    `select il.*, i.name as item_name, i.sku as item_sku
     from fin.invoice_lines il
     left join catalog.items i on i.id = il.item_id
     where il.invoice_id = $1
     order by il.line_no asc`,
    [id]
  );

  const lines = linesRes.rows;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/finance"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-medium text-slate-500 px-2 py-0.5 rounded bg-slate-100">
            {invoice.kind.replace(/_/g, " ")}
          </span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              invoice.status === "paid"
                ? "bg-pass-bg text-pass"
                : invoice.status === "issued" || invoice.status === "part_paid"
                ? "bg-navy-50 text-navy-800"
                : invoice.status === "void"
                ? "bg-fail-bg text-fail"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {invoice.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink font-mono">{invoice.invoice_no}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Issue Date: {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : "Draft"}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Total Due</span>
            <span className="text-xl font-bold text-ink tabular-nums">
              {invoice.currency}{" "}
              {(Number(invoice.total_minor) / 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
            {invoice.evat_ref && (
              <span className="text-xs text-slate-400 block font-mono">
                eVAT: {invoice.evat_ref}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Customer Billed</p>
              <p className="text-sm font-semibold text-ink">{invoice.customer_name}</p>
              <p className="text-xs font-mono text-slate-400">{invoice.account_no}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Payment Due Date</p>
              <p className="text-sm font-medium text-ink">
                {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "Net 30"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileCheck className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Billing Terms</p>
              <p className="text-sm font-medium text-ink capitalize">
                Tax Regulated Invoice
              </p>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Remarks:</span> {invoice.notes}
          </div>
        )}

        <div className="p-6">
          <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-500" />
            Invoice Line Items
          </h2>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Item / Description</th>
                  <th className="px-4 py-3 font-medium text-right">Quantity</th>
                  <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                  <th className="px-4 py-3 font-medium text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No line items recorded for this invoice.
                    </td>
                  </tr>
                ) : (
                  lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{l.line_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{l.item_name || l.description}</div>
                        {l.item_sku && (
                          <div className="font-mono text-xs text-slate-400">{l.item_sku}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                        {Number(l.qty).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {invoice.currency}{" "}
                        {(Number(l.unit_price_minor) / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">
                        {invoice.currency}{" "}
                        {(Number(l.line_total_minor) / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-medium text-xs text-slate-700 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-right font-semibold">Subtotal</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">
                    {invoice.currency} {(Number(invoice.subtotal_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {Number(invoice.discount_minor) > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-slate-500">Discount</td>
                    <td className="px-4 py-2 text-right font-mono text-fail">
                      -{invoice.currency} {(Number(invoice.discount_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {Number(invoice.tax_minor) > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-slate-500">Taxes</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {invoice.currency} {(Number(invoice.tax_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-slate-200 text-sm font-bold text-ink bg-slate-100/70">
                  <td colSpan={4} className="px-4 py-3 text-right">Total Payable</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold">
                    {invoice.currency} {(Number(invoice.total_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
