"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateItemDetailsAction, deleteItemAction } from "./actions";
import { Edit, Trash2, X, AlertTriangle } from "lucide-react";

interface ItemData {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  uom: string;
  tracking: "none" | "lot" | "serial";
  is_active: boolean;
}

export function ItemActions({ item }: { item: ItemData }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: item.name,
    description: item.description || "",
    uom: item.uom,
    tracking: item.tracking,
    isActive: item.is_active,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateItemDetailsAction(item.id, formData);
      if (res.success) {
        setIsEditing(false);
      } else {
        setError(res.error || "Failed to update item");
      }
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteItemAction(item.id);
      if (res.success) {
        setIsDeleting(false);
        router.push("/catalogue");
      } else {
        setError(res.error || "Failed to delete item");
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="h-8 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-[4px] transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Edit className="w-3.5 h-3.5 text-slate-500" />
          Edit Item
        </button>
        <button
          type="button"
          onClick={() => setIsDeleting(true)}
          className="h-8 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-medium rounded-[4px] transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          Delete
        </button>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-semibold text-ink">Edit Item ({item.sku})</h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-fail-bg border border-fail/20 rounded-[4px] text-fail text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Item Name <span className="text-fail">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 outline-none text-sm transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-[4px] border border-slate-300 focus:border-navy-800 outline-none text-sm transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Unit of Measure</label>
                  <select
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    className="w-full h-9 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 outline-none text-sm bg-white"
                  >
                    <option value="each">Each</option>
                    <option value="box">Box</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="m">Meter (m)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Tracking</label>
                  <select
                    value={formData.tracking}
                    onChange={(e) => setFormData({ ...formData, tracking: e.target.value as any })}
                    className="w-full h-9 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 outline-none text-sm bg-white"
                  >
                    <option value="none">None</option>
                    <option value="lot">Lot Tracked</option>
                    <option value="serial">Serial Tracked</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-navy-800 focus:ring-navy-800"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Item is Active (available for production & procurement)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="h-9 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-[4px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-[4px] transition-colors disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-xl max-w-md w-full overflow-hidden p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-full shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-ink">Delete or Deactivate Item</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete <strong>{item.name}</strong> ({item.sku})? If the item has historical stock ledger entries or active BOM records, it will be safely deactivated to protect audit trails.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-fail-bg border border-fail/20 rounded-[4px] text-fail text-xs">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="h-9 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-[4px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-[4px] transition-colors disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
