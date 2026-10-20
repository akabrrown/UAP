"use client";

import { useActionState, useState } from "react";
import { addBomLineAction } from "./actions";
import { Plus } from "lucide-react";

export function CreateBomLineForm({
  bomId,
  itemId,
  allItems
}: {
  bomId: string;
  itemId: string;
  allItems: Array<{ id: string; sku: string; name: string; uom: string }>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [state, formAction, isPending] = useActionState(addBomLineAction, null);

  if (!isAdding) {
    return (
      <div className="pt-4 border-t border-slate-100">
        <button 
          onClick={() => setIsAdding(true)}
          className="h-9 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Component
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-4 border-t border-slate-100">
      <h4 className="text-sm font-medium text-slate-700 mb-3">Add Component</h4>
      <form 
        action={(formData) => {
          formData.append("bomId", bomId);
          formData.append("itemId", itemId);
          formAction(formData);
          setIsAdding(false);
        }} 
        className="space-y-4 bg-slate-50/50 p-4 rounded-[4px] border border-slate-200"
      >
        {state?.error && (
          <div className="p-3 bg-fail-bg border border-fail/20 rounded-[4px] text-fail text-sm">
            {state.error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-1.5">
            <label htmlFor="componentId" className="block text-xs font-medium text-slate-700">Component</label>
            <select
              id="componentId"
              name="componentId"
              required
              className="w-full h-9 px-3 text-sm rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white"
            >
              <option value="">Select a component...</option>
              {allItems.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.sku})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="qty" className="block text-xs font-medium text-slate-700">Quantity</label>
            <input
              id="qty"
              name="qty"
              type="number"
              step="0.0001"
              min="0.0001"
              required
              className="w-full h-9 px-3 text-sm rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors"
              placeholder="1.0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="scrapPct" className="block text-xs font-medium text-slate-700">Scrap %</label>
            <input
              id="scrapPct"
              name="scrapPct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue="0"
              required
              className="w-full h-9 px-3 text-sm rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors"
            />
          </div>
          <div className="flex items-end gap-3 justify-end h-full">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="h-9 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-[4px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
            >
              {isPending ? "Adding..." : "Add to BOM"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
