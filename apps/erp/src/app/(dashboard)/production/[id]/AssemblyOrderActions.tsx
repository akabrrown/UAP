"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, AlertCircle } from "lucide-react";
import { updateAssemblyOrderAction, deleteAssemblyOrderAction } from "../actions";

interface AssemblyOrderActionsProps {
  aoId: string;
  aoNo: string;
  status: string;
  priority: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  notes: string | null;
}

export function AssemblyOrderActions({
  aoId,
  aoNo,
  status,
  priority,
  plannedStart,
  plannedEnd,
  notes,
}: AssemblyOrderActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editPriority, setEditPriority] = useState(priority || 3);
  const [editPlannedStart, setEditPlannedStart] = useState(
    plannedStart ? plannedStart.slice(0, 10) : ""
  );
  const [editPlannedEnd, setEditPlannedEnd] = useState(
    plannedEnd ? plannedEnd.slice(0, 10) : ""
  );
  const [editNotes, setEditNotes] = useState(notes || "");

  const canEdit = status !== "completed" && status !== "cancelled";
  const canDelete = status !== "completed";

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateAssemblyOrderAction(aoId, {
        priority: Number(editPriority),
        plannedStart: editPlannedStart || null,
        plannedEnd: editPlannedEnd || null,
        notes: editNotes || null,
      });

      if (res.success) {
        setIsEditOpen(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to update assembly order");
      }
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteAssemblyOrderAction(aoId);
      if (res.success) {
        setIsDeleteOpen(false);
        if (res.cancelled) {
          router.refresh();
        } else {
          router.push("/production");
        }
      } else {
        setError(res.error || "Failed to delete assembly order");
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
            Edit Schedule
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            {status === "draft" ? "Delete AO" : "Cancel AO"}
          </button>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-semibold text-ink">Edit Assembly Order Schedule</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{aoNo}</p>
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
                <label className="text-xs font-semibold text-slate-700">Production Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(Number(e.target.value))}
                  className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                >
                  <option value={1}>P1 - Critical Rush</option>
                  <option value={2}>P2 - High Priority</option>
                  <option value={3}>P3 - Normal Production</option>
                  <option value={4}>P4 - Low / Stock Buffer</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Planned Start Date</label>
                  <input
                    type="date"
                    value={editPlannedStart}
                    onChange={(e) => setEditPlannedStart(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Planned Target Completion</label>
                  <input
                    type="date"
                    value={editPlannedEnd}
                    onChange={(e) => setEditPlannedEnd(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Assembly Notes / Batch Instructions</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Special testing or packaging requirements..."
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
                  {status === "draft" ? "Delete Assembly Order" : "Cancel Assembly Order"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to {status === "draft" ? "delete" : "cancel"}{" "}
                  <span className="font-semibold text-slate-700 font-mono">{aoNo}</span>?
                </p>
                <p className="text-[11px] text-slate-400">
                  {status === "draft"
                    ? "Draft order and unreleased material reservations will be completely deleted."
                    : "This will transition the order to Cancelled status to keep serial tracking intact."}
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
