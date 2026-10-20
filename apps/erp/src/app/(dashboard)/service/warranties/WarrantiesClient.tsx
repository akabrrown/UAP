"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Calendar, 
  Wrench, 
  Plus, 
  Filter,
  Layers
} from "lucide-react";
import { extendWarrantyAction, voidWarrantyAction } from "./actions";

export interface WarrantyRow {
  id: string;
  unit_id: string;
  unit_ref: string;
  serial_no: string | null;
  model_name: string;
  sku: string;
  account_id: string | null;
  account_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  starts_on: string;
  ends_on: string;
  months: number;
  status: "active" | "expired" | "void" | "claimed";
  claims_count: number;
  components: Array<{
    item_name: string;
    serial_no: string | null;
    supplier_name: string | null;
    supplier_warranty_months: number | null;
  }>;
}

export function WarrantiesClient({
  warranties,
  userRole,
}: {
  warranties: WarrantyRow[];
  userRole: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [extendModalW, setExtendModalW] = useState<WarrantyRow | null>(null);
  const [extensionMonths, setExtensionMonths] = useState("12");
  const [extendReason, setExtendReason] = useState("");

  const [voidModalW, setVoidModalW] = useState<WarrantyRow | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const [selectedUnitGenealogy, setSelectedUnitGenealogy] = useState<WarrantyRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canOverride = userRole === "management" || userRole === "super_admin";
  const canOpenTicket = ["finance_service", "super_admin", "management"].includes(userRole);

  const filtered = warranties.filter((w) => {
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        w.unit_ref.toLowerCase().includes(q) ||
        (w.serial_no && w.serial_no.toLowerCase().includes(q)) ||
        w.model_name.toLowerCase().includes(q) ||
        (w.account_name && w.account_name.toLowerCase().includes(q)) ||
        (w.contact_phone && w.contact_phone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeCount = warranties.filter((w) => w.status === "active").length;
  const expiredCount = warranties.filter((w) => w.status === "expired").length;
  const claimedCount = warranties.filter((w) => w.claims_count > 0).length;

  const handleConfirmExtend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModalW) return;
    setError(null);

    startTransition(async () => {
      const res = await extendWarrantyAction(
        extendModalW.id,
        parseInt(extensionMonths, 10) || 12,
        extendReason
      );
      if (res.success) {
        setExtendModalW(null);
        setExtendReason("");
      } else {
        setError(res.error || "Failed to extend warranty");
      }
    });
  };

  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidModalW) return;
    setError(null);

    startTransition(async () => {
      const res = await voidWarrantyAction(voidModalW.id, voidReason);
      if (res.success) {
        setVoidModalW(null);
        setVoidReason("");
      } else {
        setError(res.error || "Failed to void warranty");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold text-rose-600 hover:text-rose-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered Warranties</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{warranties.length}</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Active Coverage</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{activeCount}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">Expired Coverage</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{expiredCount}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-800">Units with Claims</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{claimedCount}</div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {["all", "active", "expired", "void", "claimed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? "bg-[#0b192c] text-[#f4b41a]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Scan serial (UPSA-LAP-...) or search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
          />
        </div>
      </div>

      {/* Warranties Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Device / Serial</th>
              <th className="px-4 py-3">Customer Account</th>
              <th className="px-4 py-3">Warranty Window</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Claims</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                  No warranty records found matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {w.serial_no || w.unit_ref}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{w.model_name}</div>
                    {w.serial_no && (
                      <div className="text-[11px] font-mono text-slate-400">Ref: {w.unit_ref}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {w.account_name ? (
                      <div>
                        <div className="font-semibold text-slate-800">{w.account_name}</div>
                        {w.contact_phone && (
                          <div className="text-slate-400 text-[11px]">{w.contact_phone}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned (Pre-dispatch)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium text-slate-800">
                      {w.starts_on} to {w.ends_on}
                    </div>
                    <div className="text-[11px] text-slate-500">{w.months} Months Coverage</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        w.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : w.status === "expired"
                          ? "bg-slate-100 text-slate-600"
                          : w.status === "void"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {w.claims_count > 0 ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                        {w.claims_count} ticket{w.claims_count > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-slate-400">0 claims</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Component breakdown */}
                      <button
                        onClick={() => setSelectedUnitGenealogy(w)}
                        className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                        title="View Component Supplier Coverage"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>

                      {/* FS: Open Ticket */}
                      {canOpenTicket && (
                        <Link
                          href={`/service/new?unit=${w.unit_id}`}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded hover:bg-[#1a2d47] transition-colors"
                        >
                          Open ticket
                        </Link>
                      )}

                      {/* MG: Extend Warranty */}
                      {canOverride && (
                        <button
                          onClick={() => {
                            setExtendModalW(w);
                            setExtensionMonths("12");
                            setExtendReason("");
                          }}
                          className="px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50 rounded"
                        >
                          Extend
                        </button>
                      )}

                      {/* MG: Void Warranty */}
                      {canOverride && w.status !== "void" && (
                        <button
                          onClick={() => {
                            setVoidModalW(w);
                            setVoidReason("");
                          }}
                          className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded"
                        >
                          Void
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Component Coverage Drawer Modal */}
      {selectedUnitGenealogy && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Supplier Coverage: {selectedUnitGenealogy.serial_no || selectedUnitGenealogy.unit_ref}
                </h3>
                <p className="text-xs text-slate-500">Component warranty breakdown per Section 11.</p>
              </div>
              <button
                onClick={() => setSelectedUnitGenealogy(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-2"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {selectedUnitGenealogy.components && selectedUnitGenealogy.components.length > 0 ? (
                selectedUnitGenealogy.components.map((c, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{c.item_name}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        Serial: {c.serial_no || "N/A"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-700 font-medium">{c.supplier_name || "Direct OEM"}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">
                        {c.supplier_warranty_months ? `${c.supplier_warranty_months} mo warranty` : "Standard 12 mo"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No discrete component serials scanned for this finished unit.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedUnitGenealogy(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Warranty Modal */}
      {extendModalW && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmExtend}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-indigo-900 font-semibold text-sm">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>Extend Warranty: {extendModalW.serial_no || extendModalW.unit_ref}</span>
            </div>
            <p className="text-xs text-slate-600">
              Management authorization required. Extending will shift the expiry date forward and record an approval audit log.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Coverage Period
              </label>
              <select
                value={extensionMonths}
                onChange={(e) => setExtensionMonths(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="6">6 Months Extension</option>
                <option value="12">12 Months (1 Year) Extension</option>
                <option value="24">24 Months (2 Years) Extension</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Approval Notes <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="E.g. Vice-Chancellor goodwill extension granted for institutional deployment."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExtendModalW(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !extendReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isPending ? "Recording..." : "Confirm Extension"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Void Warranty Modal */}
      {voidModalW && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmVoid}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-rose-900 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Void Warranty: {voidModalW.serial_no || voidModalW.unit_ref}</span>
            </div>
            <p className="text-xs text-slate-600">
              Per Section 11 workflow, voiding warranty revokes free repair entitlements. A mandatory reason is required.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Voiding <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="E.g. Liquid ingress and unauthorised third-party motherboard tampering detected during bench inspection."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVoidModalW(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={isPending || !voidReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {isPending ? "Voiding..." : "Confirm Void Warranty"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
