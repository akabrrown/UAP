"use client";

import { useActionState, use } from "react";
import { createTransferAction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewTransferClient({ locationsPromise }: { locationsPromise: Promise<any[]> }) {
  const [state, formAction, isPending] = useActionState(createTransferAction, null);
  const locations = use(locationsPromise);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">New Stock Transfer</h1>
          <p className="text-sm text-slate-500">Create a new internal movement of goods.</p>
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
              <label htmlFor="from_location_id" className="block text-sm font-medium text-slate-700">From Location</label>
              <select
                id="from_location_id"
                name="from_location_id"
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white"
              >
                <option value="">(None - Initial Receipt)</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="to_location_id" className="block text-sm font-medium text-slate-700">To Location <span className="text-fail">*</span></label>
              <select
                id="to_location_id"
                name="to_location_id"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white"
              >
                <option value="">Select destination...</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <Link
            href="/inventory"
            className="h-10 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-[4px] transition-colors flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 bg-navy-900 hover:bg-navy-800 text-white font-medium rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Creating..." : "Create Transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}
