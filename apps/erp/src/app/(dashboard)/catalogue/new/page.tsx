"use client";

import { useActionState } from "react";
import { createItemAction } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewItemPage() {
  const [state, formAction, isPending] = useActionState(createItemAction, null);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/catalogue" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">New Item</h1>
          <p className="text-sm text-slate-500">Create a new item in the catalogue.</p>
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
              <label htmlFor="sku" className="block text-sm font-medium text-slate-700">SKU <span className="text-fail">*</span></label>
              <input
                id="sku"
                name="sku"
                type="text"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors"
                placeholder="e.g. COMP-CPU-001"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">Item Name <span className="text-fail">*</span></label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors"
                placeholder="Intel Core i7-12700K"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="w-full p-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors resize-none"
              placeholder="Optional description of the item..."
            />
          </div>

          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label htmlFor="kind" className="block text-sm font-medium text-slate-700">Kind <span className="text-fail">*</span></label>
              <select
                id="kind"
                name="kind"
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white"
              >
                <option value="component">Component</option>
                <option value="finished_good">Finished Good</option>
                <option value="accessory">Accessory</option>
                <option value="consumable">Consumable</option>
                <option value="packaging">Packaging</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="tracking" className="block text-sm font-medium text-slate-700">Tracking <span className="text-fail">*</span></label>
              <select
                id="tracking"
                name="tracking"
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white"
              >
                <option value="none">None</option>
                <option value="lot">Lot Tracked</option>
                <option value="serial">Serial Tracked</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="uom" className="block text-sm font-medium text-slate-700">Unit of Measure <span className="text-fail">*</span></label>
              <select
                id="uom"
                name="uom"
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white"
              >
                <option value="each">Each</option>
                <option value="box">Box</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="m">Meter (m)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <Link
            href="/catalogue"
            className="h-10 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-[4px] transition-colors flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 px-6 bg-navy-900 hover:bg-navy-800 text-white font-medium rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Creating..." : "Create Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
