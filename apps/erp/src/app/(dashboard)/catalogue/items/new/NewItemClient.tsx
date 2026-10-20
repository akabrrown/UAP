"use client";

import { useActionState, use, useState, useTransition } from "react";
import { createItemAction, createCategoryAction } from "./actions";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";

export default function NewItemClient({ categoriesPromise }: { categoriesPromise: Promise<any[]> }) {
  const [state, formAction, isPending] = useActionState(createItemAction, null);
  const initialCategories = use(categoriesPromise);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  
  // Category creation modal state
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatTracking, setNewCatTracking] = useState<"serial" | "lot" | "none">("serial");
  const [catError, setCatError] = useState<string | null>(null);
  const [isCatPending, startCatTransition] = useTransition();

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCatError(null);
    startCatTransition(async () => {
      const res = await createCategoryAction({
        name: newCatName.trim(),
        defaultTracking: newCatTracking,
      });

      if (res.success && res.category) {
        setCategories((prev) => [...prev, res.category]);
        setSelectedCategoryId(res.category.id);
        setNewCatName("");
        setIsAddingCat(false);
      } else {
        setCatError(res.error || "Failed to create category");
      }
    });
  };

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

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="category_id" className="block text-sm font-medium text-slate-700">Category</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCat(true)}
                  className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Category
                </button>
              </div>
              <select
                id="category_id"
                name="category_id"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors bg-white"
              >
                <option value="">(None)</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
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

      {/* New Category Modal */}
      {isAddingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-semibold text-ink">Create New Category</h3>
              <button
                type="button"
                onClick={() => setIsAddingCat(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-5 space-y-4">
              {catError && (
                <div className="p-3 bg-fail-bg border border-fail/20 rounded-[4px] text-fail text-xs">
                  {catError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Category Name <span className="text-fail">*</span></label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Hardware Components"
                  className="w-full h-9 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-sm transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Default Tracking</label>
                <select
                  value={newCatTracking}
                  onChange={(e) => setNewCatTracking(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-sm transition-colors bg-white"
                >
                  <option value="serial">Serial Tracked</option>
                  <option value="lot">Lot Tracked</option>
                  <option value="none">No Tracking</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCat(false)}
                  className="h-9 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-[4px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCatPending}
                  className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-[4px] transition-colors disabled:opacity-50"
                >
                  {isCatPending ? "Creating..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
