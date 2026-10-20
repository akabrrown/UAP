"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { decideApprovalAction } from "./actions";

interface ApprovalButtonsProps {
  approvalId: string;
}

export function ApprovalButtons({ approvalId }: ApprovalButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleDecision(decision: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("approval_id", approvalId);
      formData.set("decision", decision);
      if (note) {
        formData.set("decision_note", note);
      }

      const res = await decideApprovalAction(null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setShowModal(null);
        setNote("");
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setShowModal("rejected")}
          className="p-1.5 hover:bg-fail-bg/40 text-slate-400 hover:text-fail rounded transition-colors"
          title="Reject Request"
        >
          <XCircle className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowModal("approved")}
          className="p-1.5 hover:bg-pass-bg/40 text-slate-400 hover:text-pass rounded transition-colors"
          title="Approve Request"
        >
          <CheckCircle className="w-5 h-5" />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              {showModal === "approved" ? (
                <div className="w-10 h-10 rounded-full bg-pass-bg flex items-center justify-center text-pass shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-fail-bg flex items-center justify-center text-fail shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-base font-semibold text-ink">
                  {showModal === "approved" ? "Authorize Request" : "Reject Request"}
                </h3>
                <p className="text-xs text-slate-500">
                  {showModal === "approved"
                    ? "Dual-custody verification will sign off this transaction."
                    : "This request will be marked as rejected and its source cancelled."}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-fail-bg text-fail rounded text-xs border border-fail/20 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Decision Note {showModal === "rejected" ? "(Required)" : "(Optional)"}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={showModal === "rejected" ? "Reason for rejecting..." : "Approval remarks..."}
                rows={3}
                className="w-full text-sm p-2.5 rounded border border-slate-200 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(null);
                  setError(null);
                }}
                disabled={isPending}
                className="px-3 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecision(showModal)}
                disabled={isPending || (showModal === "rejected" && !note.trim())}
                className={`px-4 py-1.5 rounded text-xs font-medium text-white flex items-center gap-1.5 transition-colors ${
                  showModal === "approved"
                    ? "bg-pass hover:bg-pass/90"
                    : "bg-fail hover:bg-fail/90"
                } disabled:opacity-50`}
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm {showModal === "approved" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
