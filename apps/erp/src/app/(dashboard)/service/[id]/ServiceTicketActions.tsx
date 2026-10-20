"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, AlertCircle } from "lucide-react";
import { updateServiceTicketAction, deleteServiceTicketAction } from "../actions";

interface ServiceTicketActionsProps {
  ticketId: string;
  ticketNo: string;
  status: string;
  priority: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  faultDescription: string;
  diagnosis: string | null;
  resolution: string | null;
}

export function ServiceTicketActions({
  ticketId,
  ticketNo,
  status,
  priority,
  contactName,
  contactPhone,
  contactEmail,
  faultDescription,
  diagnosis,
  resolution,
}: ServiceTicketActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editPriority, setEditPriority] = useState(priority || "normal");
  const [editStatus, setEditStatus] = useState(status || "received");
  const [editContactName, setEditContactName] = useState(contactName || "");
  const [editContactPhone, setEditContactPhone] = useState(contactPhone || "");
  const [editContactEmail, setEditContactEmail] = useState(contactEmail || "");
  const [editFault, setEditFault] = useState(faultDescription || "");
  const [editDiagnosis, setEditDiagnosis] = useState(diagnosis || "");
  const [editResolution, setEditResolution] = useState(resolution || "");

  const canEdit = status !== "closed" && status !== "declined";
  const canDelete = status !== "closed";

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateServiceTicketAction(ticketId, {
        priority: editPriority,
        status: editStatus,
        contactName: editContactName || undefined,
        contactPhone: editContactPhone || null,
        contactEmail: editContactEmail || null,
        faultDescription: editFault || undefined,
        diagnosis: editDiagnosis || null,
        resolution: editResolution || null,
      });

      if (res.success) {
        setIsEditOpen(false);
        router.refresh();
      } else {
        setError(res.error || "Failed to update ticket");
      }
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteServiceTicketAction(ticketId);
      if (res.success) {
        setIsDeleteOpen(false);
        if (res.declined) {
          router.refresh();
        } else {
          router.push("/service");
        }
      } else {
        setError(res.error || "Failed to delete ticket");
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
            Edit Ticket
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            {status === "received" ? "Delete Ticket" : "Decline Ticket"}
          </button>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-semibold text-ink">Edit Service Ticket</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{ticketNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="received">Received</option>
                    <option value="diagnosing">Diagnosing</option>
                    <option value="awaiting_approval">Awaiting Approval</option>
                    <option value="awaiting_parts">Awaiting Parts</option>
                    <option value="in_repair">In Repair</option>
                    <option value="testing">Testing</option>
                    <option value="ready_for_collection">Ready for Pickup</option>
                    <option value="closed">Closed / Solved</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Contact Person Name</label>
                <input
                  type="text"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Contact Phone</label>
                  <input
                    type="tel"
                    value={editContactPhone}
                    onChange={(e) => setEditContactPhone(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Contact Email</label>
                  <input
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Fault Description</label>
                <textarea
                  rows={2}
                  value={editFault}
                  onChange={(e) => setEditFault(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Diagnosis Notes</label>
                <textarea
                  rows={2}
                  value={editDiagnosis}
                  placeholder="Technician bench diagnosis findings..."
                  onChange={(e) => setEditDiagnosis(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Resolution Summary</label>
                <textarea
                  rows={2}
                  value={editResolution}
                  placeholder="Actions taken to fix the issue..."
                  onChange={(e) => setEditResolution(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
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

      {/* Delete / Decline Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-ink">
                  {status === "received" ? "Delete Service Ticket" : "Decline Service Ticket"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to {status === "received" ? "delete" : "decline"}{" "}
                  <span className="font-semibold text-slate-700 font-mono">{ticketNo}</span>?
                </p>
                <p className="text-[11px] text-slate-400">
                  {status === "received"
                    ? "Received ticket with no parts recorded will be deleted with full audit logging."
                    : "This will transition ticket status to Declined to maintain technician logs."}
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
                {isPending ? "Processing..." : status === "received" ? "Confirm Delete" : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
