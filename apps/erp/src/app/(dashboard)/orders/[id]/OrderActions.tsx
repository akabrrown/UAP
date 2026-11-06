"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, AlertCircle } from "lucide-react";
import { updateInternalOrderAction, deleteInternalOrderAction } from "../actions";

interface OrderActionsProps {
  orderId: string;
  orderNo: string;
  status: string;
  deliveryPoint: string | null;
  requiredBy: string | null;
  notes: string | null;
}

export function OrderActions({
  orderId,
  orderNo,
  status,
  deliveryPoint,
  requiredBy,
  notes,
}: OrderActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editDeliveryPoint, setEditDeliveryPoint] = useState(deliveryPoint || "");
  const [editRequiredBy, setEditRequiredBy] = useState(
    requiredBy ? (typeof requiredBy === "string" ? requiredBy.slice(0, 10) : new Date(requiredBy).toISOString().slice(0, 10)) : ""
  );

  const [editNotes, setEditNotes] = useState(notes || "");

  const canEdit = status !== "completed" && status !== "cancelled";
  const canDelete = status !== "completed";

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateInternalOrderAction(orderId, {
        deliveryPoint: editDeliveryPoint || null,
        requiredBy: editRequiredBy || null,
        notes: editNotes || null,
      });

      if (res.success) {
        setIsEditOpen(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to update order");
      }
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteInternalOrderAction(orderId);
      if (res.success) {
        setIsDeleteOpen(false);
        if (res.cancelled) {
          router.refresh();
        } else {
          router.push("/orders");
        }
      } else {
        setError(res.error || "Failed to delete order");
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
            Edit Order
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            {status === "draft" ? "Delete Order" : "Cancel Order"}
          </button>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-semibold text-ink">Edit Sales Order</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{orderNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Required By Date</label>
                <input
                  type="date"
                  value={editRequiredBy}
                  onChange={(e) => setEditRequiredBy(e.target.value)}
                  className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Delivery Point / Destination</label>
                <input
                  type="text"
                  value={editDeliveryPoint}
                  onChange={(e) => setEditDeliveryPoint(e.target.value)}
                  placeholder="e.g. Accra Central Hub or Customer Warehouse"
                  className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Order Notes & Fulfillment Instructions</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Special handling or payment notes..."
                  className="w-full p-2.5 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="h-8 px-3 text-xs text-slate-600 hover:text-ink font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-8 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Cancel Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-ink">
                  {status === "draft" ? "Delete Sales Order" : "Cancel Sales Order"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to {status === "draft" ? "delete" : "cancel"}{" "}
                  <span className="font-semibold text-slate-700 font-mono">{orderNo}</span>?
                </p>
                <p className="text-[11px] text-slate-400">
                  {status === "draft"
                    ? "Draft order and its lines will be removed with full audit logging."
                    : "This will transition the order status to Cancelled to maintain audit trails."}
                </p>
                {error && (
                  <div className="p-2.5 mt-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded">
                    {error}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="h-8 px-3 text-xs text-slate-600 hover:text-ink font-medium"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="h-8 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded disabled:opacity-50"
              >
                {isPending ? "Processing..." : status === "draft" ? "Confirm Delete" : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
