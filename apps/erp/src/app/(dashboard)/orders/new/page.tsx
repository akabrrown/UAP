"use client";

import { useActionState } from "react";
import { createInternalOrderAction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewInternalOrderPage() {
  const [state, formAction, isPending] = useActionState(createInternalOrderAction, null);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">New Internal Order</h1>
          <p className="text-sm text-slate-500">Request stock or assembled units for a department.</p>
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
              <label htmlFor="account_id" className="block text-sm font-medium text-slate-700">Requesting Account</label>
              <input
                id="account_id"
                name="account_id"
                type="text"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                placeholder="Enter account UUID..."
              />
              <p className="text-xs text-slate-500">In a full UI, this would be a searchable dropdown of customer accounts.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="purpose" className="block text-sm font-medium text-slate-700">Purpose</label>
              <select
                id="purpose"
                name="purpose"
                required
                defaultValue="internal_use"
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white text-sm"
              >
                <option value="internal_use">Internal Use (UPSA)</option>
                <option value="project">Special Project</option>
                <option value="training">Training</option>
                <option value="demo">Demonstration</option>
                <option value="replacement">Replacement</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="required_by" className="block text-sm font-medium text-slate-700">Required By Date</label>
              <input
                id="required_by"
                name="required_by"
                type="date"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notes / Delivery Instructions</label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full p-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm resize-y"
                placeholder="Where should this be delivered?"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <Link href="/orders" className="h-10 px-4 inline-flex items-center justify-center border border-slate-300 hover:bg-white text-slate-700 text-sm font-medium rounded-[4px] transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
