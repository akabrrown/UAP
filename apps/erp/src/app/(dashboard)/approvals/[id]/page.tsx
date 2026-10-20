import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, User, FileText, DollarSign } from "lucide-react";
import { requireAnyScope } from "@/lib/session";
import { ApprovalButtons } from "../approval-buttons";

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyScope([
    "procurement.approve",
    "orders.approve",
    "payments.approve",
    "expenses.approve",
    "service.approve",
    "inventory.adjust.approve",
    "bom.approve"
  ]);

  const { id } = await params;

  const result = await db.query(
    `select a.*, 
            req.full_name as requested_by_name,
            req.email as requested_by_email,
            dec.full_name as decided_by_name
     from core.approvals a
     join core.profiles req on req.id = a.requested_by
     left join core.profiles dec on dec.id = a.decided_by
     where a.id = $1`,
    [id]
  );

  const approval = result.rows[0];
  if (!approval) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/approvals"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Approvals
        </Link>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            approval.status === "approved"
              ? "bg-pass-bg text-pass"
              : approval.status === "rejected"
              ? "bg-fail-bg text-fail"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {approval.status}
        </span>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink capitalize">
              {approval.subject_type.replace(/_/g, " ")} Approval Request
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono">ID: {approval.id}</p>
          </div>
          {approval.status === "pending" && (
            <div className="flex items-center gap-2">
              <ApprovalButtons approvalId={approval.id} />
            </div>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Request Details
            </h2>

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Requested By</p>
                <p className="text-sm font-medium text-ink">{approval.requested_by_name}</p>
                <p className="text-xs text-slate-400">{approval.requested_by_email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Requested Date</p>
                <p className="text-sm font-medium text-ink">
                  {new Date(approval.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {approval.amount_minor && (
              <div className="flex items-start gap-3">
                <DollarSign className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Subject Amount</p>
                  <p className="text-base font-semibold text-ink tabular-nums">
                    {approval.currency}{" "}
                    {(Number(approval.amount_minor) / 100).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Linked Subject ID</p>
                <p className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded mt-0.5 inline-block">
                  {approval.subject_id}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Decision & Audit
            </h2>

            {approval.status !== "pending" ? (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Decided By</p>
                  <p className="text-sm font-medium text-ink">
                    {approval.decided_by_name || "System"}
                  </p>
                </div>
                {approval.decided_at && (
                  <div>
                    <p className="text-xs text-slate-500">Decided At</p>
                    <p className="text-sm font-medium text-ink">
                      {new Date(approval.decided_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {approval.decision_note && (
                  <div>
                    <p className="text-xs text-slate-500">Decision Note</p>
                    <p className="text-sm text-slate-700 italic bg-white p-2.5 rounded border border-slate-200 mt-1">
                      "{approval.decision_note}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-900">Awaiting Sign-off</h3>
                  <p className="text-xs text-amber-700 mt-1">
                    This request requires an authorized reviewer. Requesters are prohibited from
                    approving their own submissions by dual-custody separation.
                  </p>
                </div>
              </div>
            )}

            {approval.reason && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Requester Reason / Context</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100">
                  {approval.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
