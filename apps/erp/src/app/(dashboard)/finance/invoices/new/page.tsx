"use client";

import { useActionState } from "react";
import { createInvoiceAction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewInvoicePage() {
  const [state, formAction, isPending] = useActionState(createInvoiceAction, null);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/finance" className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Create Invoice</h1>
          <p className="text-sm text-slate-500">Generate a new internal bill for a department or unit.</p>
        </div>
      </div>

      <form action={formAction} className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          {state?.error && (
            <div className="p-3 bg-fail-bg border border-fail/20 rounded-[4px] text-fail text-sm">
              {state.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 space-y-2">
              <label htmlFor="customer_id" className="block text-sm font-medium text-slate-700">Customer Account</label>
              <input
                id="customer_id"
                name="customer_id"
                type="text"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                placeholder="Enter customer account UUID..."
              />
              <p className="text-xs text-slate-500">In a full UI, this would be a searchable dropdown.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="due_date" className="block text-sm font-medium text-slate-700">Due Date</label>
              <input
                id="due_date"
                name="due_date"
                type="date"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="currency" className="block text-sm font-medium text-slate-700">Currency</label>
              <select
                id="currency"
                name="currency"
                required
                defaultValue="GHS"
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white text-sm"
              >
                <option value="GHS">GHS - Ghana Cedi</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>

            <div className="col-span-2 space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notes / Description</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full p-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm resize-y"
                placeholder="Invoice terms, details, etc."
              />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <Link href="/finance" className="h-10 px-4 inline-flex items-center justify-center border border-slate-300 hover:bg-white text-slate-700 text-sm font-medium rounded-[4px] transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
