"use client";

import { useActionState } from "react";
import { createPurchaseOrderAction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { use } from "react";

export default function NewPurchaseOrderPage({ suppliersPromise }: { suppliersPromise: Promise<any[]> }) {
  const [state, formAction, isPending] = useActionState(createPurchaseOrderAction, null);
  const suppliers = use(suppliersPromise);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/procurement" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">New Purchase Order</h1>
          <p className="text-sm text-slate-500">Create a draft PO to order goods.</p>
        </div>
      </div>

      <form action={formAction} className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          {state?.error && (
            <div className="p-3 bg-fail-bg border border-fail/20 rounded-[4px] text-fail text-sm">
              {state.error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="supplier_id" className="block text-sm font-medium text-slate-700">Supplier <span className="text-fail">*</span></label>
              <select
                id="supplier_id"
                name="supplier_id"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white"
              >
                <option value="">Select a supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="currency" className="block text-sm font-medium text-slate-700">Currency <span className="text-fail">*</span></label>
              <select
                id="currency"
                name="currency"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white"
                defaultValue="GHS"
              >
                <option value="GHS">GHS (Ghana Cedi)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="CNY">CNY (Chinese Yuan)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="expected_arrival" className="block text-sm font-medium text-slate-700">Expected Arrival Date</label>
              <input
                id="expected_arrival"
                name="expected_arrival"
                type="date"
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <Link
            href="/procurement"
            className="h-10 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-[4px] transition-colors flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 bg-navy-900 hover:bg-navy-800 text-white font-medium rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Creating..." : "Create PO"}
          </button>
        </div>
      </form>
    </div>
  );
}
