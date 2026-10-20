"use client";

import { useActionState, useState, use } from "react";
import { createInvoiceAction } from "./actions";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Receipt } from "lucide-react";

interface ItemOption {
  id: string;
  sku: string;
  name: string;
  standard_cost_minor: string | null;
}

interface InvoiceLineRow {
  itemId: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export default function NewInvoiceClient({
  customersPromise,
  itemsPromise,
}: {
  customersPromise: Promise<any[]>;
  itemsPromise: Promise<ItemOption[]>;
}) {
  const [state, formAction, isPending] = useActionState(createInvoiceAction, null);
  const customers = use(customersPromise);
  const items = use(itemsPromise);

  const [currency, setCurrency] = useState("GHS");
  const [lines, setLines] = useState<InvoiceLineRow[]>([
    { itemId: "", description: "", qty: 1, unitPrice: 0 }
  ]);

  function addLine() {
    setLines([...lines, { itemId: "", description: "", qty: 1, unitPrice: 0 }]);
  }

  function removeLine(idx: number) {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  }

  function updateLine(idx: number, patch: Partial<InvoiceLineRow>) {
    setLines(
      lines.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, ...patch };
        if (patch.itemId !== undefined) {
          const item = items.find((it) => it.id === patch.itemId);
          if (item) {
            updated.description = item.name;
            if (item.standard_cost_minor && updated.unitPrice === 0) {
              updated.unitPrice = Number(item.standard_cost_minor) / 100;
            }
          }
        }
        return updated;
      })
    );
  }

  const grandTotal = lines.reduce((acc, l) => acc + (l.unitPrice || 0) * (l.qty || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/finance"
          className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Create Invoice</h1>
          <p className="text-sm text-slate-500">
            Generate an official internal or external invoice with line item billing.
          </p>
        </div>
      </div>

      <form
        action={formAction}
        className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-6 space-y-8">
          {state?.error && (
            <div className="p-3 bg-fail-bg border border-fail/20 rounded-[4px] text-fail text-sm font-medium">
              {state.error}
            </div>
          )}

          {/* Hidden lines json */}
          <input type="hidden" name="lines_json" value={JSON.stringify(lines)} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label htmlFor="account_id" className="block text-sm font-medium text-slate-700">
                Customer Account <span className="text-fail">*</span>
              </label>
              <select
                id="account_id"
                name="account_id"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm bg-white"
              >
                <option value="">Select a customer...</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.account_no})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="kind" className="block text-sm font-medium text-slate-700">
                Invoice Type <span className="text-fail">*</span>
              </label>
              <select
                id="kind"
                name="kind"
                required
                defaultValue="tax_invoice"
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white text-sm"
              >
                <option value="tax_invoice">Tax Invoice</option>
                <option value="proforma">Proforma</option>
                <option value="credit_note">Credit Note</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="currency" className="block text-sm font-medium text-slate-700">
                Currency <span className="text-fail">*</span>
              </label>
              <select
                id="currency"
                name="currency"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white text-sm"
              >
                <option value="GHS">GHS - Ghana Cedi</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="due_date" className="block text-sm font-medium text-slate-700">
                Due Date <span className="text-fail">*</span>
              </label>
              <input
                id="due_date"
                name="due_date"
                type="date"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
                Payment Terms / Remarks
              </label>
              <input
                id="notes"
                name="notes"
                type="text"
                placeholder="e.g. Net 30, payment to Ecobank account"
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
              />
            </div>
          </div>

          {/* Line items section */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  Invoice Line Items
                </h2>
                <p className="text-xs text-slate-500">Add products, assembly charges, or service fees.</p>
              </div>
              <button
                type="button"
                onClick={addLine}
                className="h-8 px-3 rounded-[4px] border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Item / Description</th>
                    <th className="px-3 py-2.5 w-28 text-right">Quantity</th>
                    <th className="px-3 py-2.5 w-36 text-right">Unit Price ({currency})</th>
                    <th className="px-3 py-2.5 w-36 text-right">Line Total</th>
                    <th className="px-3 py-2.5 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 space-y-1">
                        <select
                          value={l.itemId}
                          onChange={(e) => updateLine(idx, { itemId: e.target.value })}
                          className="w-full h-8 px-2 text-xs rounded border border-slate-300 focus:border-navy-800 outline-none bg-white mb-1"
                        >
                          <option value="">Select SKU (or enter custom below)...</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} ({it.sku})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Line item description..."
                          value={l.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                          required
                          className="w-full h-8 px-2 text-xs rounded border border-slate-300 focus:border-navy-800 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={l.qty}
                          onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })}
                          className="w-full h-9 px-2 text-xs text-right rounded border border-slate-300 focus:border-navy-800 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={l.unitPrice}
                          onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) })}
                          className="w-full h-9 px-2 text-xs text-right rounded border border-slate-300 focus:border-navy-800 outline-none tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-xs tabular-nums text-ink">
                        {currency}{" "}
                        {((l.unitPrice || 0) * (l.qty || 0)).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length === 1}
                          className="p-1 text-slate-400 hover:text-fail disabled:opacity-30 transition-colors"
                          title="Remove line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 text-xs font-semibold border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-right text-slate-700">
                      Total Invoice Amount:
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-sm text-ink tabular-nums">
                      {currency}{" "}
                      {grandTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <Link
            href="/finance"
            className="h-10 px-4 inline-flex items-center justify-center border border-slate-300 hover:bg-white text-slate-700 text-sm font-medium rounded-[4px] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
          >
            {isPending ? "Creating Invoice..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
