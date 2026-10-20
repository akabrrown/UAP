"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { 
  Wrench, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ExternalLink, 
  AlertTriangle, 
  Search,
  Filter
} from "lucide-react";
import { startReworkAction, markReworkFixedAction, cancelReworkAction } from "./actions";

export interface ReworkOrderRow {
  id: string;
  rework_no: string;
  unit_id: string;
  unit_ref: string;
  serial_no: string | null;
  model_name: string;
  sku: string;
  status: "open" | "in_progress" | "done" | "cancelled";
  description: string;
  assigned_to: string | null;
  technician_name: string | null;
  created_at: string;
  resolved_at: string | null;
  defects: Array<{
    code: string;
    name: string;
    severity: string;
    notes: string;
  }>;
}

export function ReworkClient({
  reworkOrders,
  currentUserRole,
  currentUserId,
}: {
  reworkOrders: ReworkOrderRow[];
  currentUserRole: string;
  currentUserId: string;
}) {
  const [filterTab, setFilterTab] = useState<"all" | "open" | "in_progress" | "done" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [fixedModalOrder, setFixedModalOrder] = useState<ReworkOrderRow | null>(null);
  const [fixedNotes, setFixedNotes] = useState("");
  const [cancelModalOrder, setCancelModalOrder] = useState<ReworkOrderRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const isTechnician = ["assembly_technician", "super_admin", "management"].includes(currentUserRole);
  const isManagementOrIS = ["inventory_sales", "management", "super_admin"].includes(currentUserRole);

  const filtered = reworkOrders.filter((r) => {
    if (filterTab !== "all" && r.status !== filterTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.rework_no.toLowerCase().includes(q) ||
        r.unit_ref.toLowerCase().includes(q) ||
        (r.serial_no && r.serial_no.toLowerCase().includes(q)) ||
        r.model_name.toLowerCase().includes(q) ||
        (r.technician_name && r.technician_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleStartRework = (reworkId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await startReworkAction(reworkId);
      if (!res.success) {
        setActionError(res.error || "Failed to start rework");
      }
    });
  };

  const handleConfirmFixed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedModalOrder) return;
    setActionError(null);
    startTransition(async () => {
      const res = await markReworkFixedAction(fixedModalOrder.id, fixedNotes);
      if (res.success) {
        setFixedModalOrder(null);
        setFixedNotes("");
      } else {
        setActionError(res.error || "Failed to mark rework fixed");
      }
    });
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    if (!cancelReason.trim()) {
      setActionError("Cancellation reason is mandatory");
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const res = await cancelReworkAction(cancelModalOrder.id, cancelReason);
      if (res.success) {
        setCancelModalOrder(null);
        setCancelReason("");
      } else {
        setActionError(res.error || "Failed to cancel rework");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-semibold text-rose-600 hover:text-rose-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Orders</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{reworkOrders.length}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">Awaiting Tech (Open)</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">
            {reworkOrders.filter((r) => r.status === "open").length}
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-800">In Progress</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {reworkOrders.filter((r) => r.status === "in_progress").length}
          </div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Fixed & Tested (Done)</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">
            {reworkOrders.filter((r) => r.status === "done").length}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {(["all", "open", "in_progress", "done", "cancelled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterTab === tab
                  ? "bg-[#0b192c] text-[#f4b41a]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rework, unit, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
          />
        </div>
      </div>

      {/* Rework Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Rework Order</th>
              <th className="px-4 py-3">Unit / Model</th>
              <th className="px-4 py-3">Defects & Reason</th>
              <th className="px-4 py-3">Assigned Tech</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                  No rework orders found matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-slate-400" />
                      <span>{r.rework_no}</span>
                    </div>
                    <div className="text-xs font-normal text-slate-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/production/units/${r.unit_id}`}
                      className="font-medium text-[#0b192c] hover:underline flex items-center gap-1"
                    >
                      <span>{r.unit_ref}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <div className="text-xs text-slate-500">{r.model_name}</div>
                    {r.serial_no && (
                      <div className="text-[11px] font-mono text-emerald-700 font-semibold">{r.serial_no}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-2">
                      {r.description || "Defects during QC inspection"}
                    </div>
                    {r.defects && r.defects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.defects.map((d, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                              d.severity === "critical"
                                ? "bg-rose-100 text-rose-800"
                                : d.severity === "major"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {d.name || d.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.technician_name ? (
                      <span className="font-medium text-slate-800">{r.technician_name}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        r.status === "open"
                          ? "bg-amber-100 text-amber-800"
                          : r.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : r.status === "done"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.status === "in_progress" ? "In Progress" : r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* AT: Start Rework */}
                      {isTechnician && r.status === "open" && (
                        <button
                          onClick={() => handleStartRework(r.id)}
                          disabled={isPending}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded hover:bg-[#1a2d47] transition-colors"
                        >
                          Start rework
                        </button>
                      )}

                      {/* AT: Mark Fixed */}
                      {isTechnician && r.status === "in_progress" && (
                        <button
                          onClick={() => {
                            setFixedModalOrder(r);
                            setFixedNotes("");
                          }}
                          disabled={isPending}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                        >
                          Mark fixed
                        </button>
                      )}

                      {/* IS, MG: Cancel */}
                      {isManagementOrIS && (r.status === "open" || r.status === "in_progress") && (
                        <button
                          onClick={() => {
                            setCancelModalOrder(r);
                            setCancelReason("");
                          }}
                          disabled={isPending}
                          className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Link to unit */}
                      <Link
                        href={`/production/units/${r.unit_id}`}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                        title="Open Unit Workspace"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mark Fixed Modal */}
      {fixedModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmFixed}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Mark Rework Fixed: {fixedModalOrder.rework_no}</span>
            </div>
            <p className="text-xs text-slate-600">
              Confirming fix will return unit <strong className="text-slate-900">{fixedModalOrder.unit_ref}</strong> to{" "}
              <strong className="text-emerald-700">Testing</strong> status and notify QC inspectors for re-test.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Technician Resolution Notes
              </label>
              <textarea
                rows={3}
                required
                value={fixedNotes}
                onChange={(e) => setFixedNotes(e.target.value)}
                placeholder="E.g. Replaced faulty DDR4 SODIMM in slot 2, updated BIOS to v1.4, diagnostic test passed."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFixedModalOrder(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "Confirm Fixed & Return to Test"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Rework Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmCancel}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-rose-900 font-semibold">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Cancel Rework Order: {cancelModalOrder.rework_no}</span>
            </div>
            <p className="text-xs text-slate-600">
              Per Section 08 workflow, cancelling rework requires an explicit reason. The unit will be put on{" "}
              <strong className="text-amber-800">QC Hold</strong> for scrap disposition or reassignment.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="E.g. Irreparable motherboard trace crack; unit scheduled for scrapping."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={isPending || !cancelReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {isPending ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
