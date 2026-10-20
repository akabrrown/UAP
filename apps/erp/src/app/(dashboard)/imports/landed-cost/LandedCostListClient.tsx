"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scale,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowRight,
  Ship,
} from "lucide-react";
import { createLandedCostRun } from "./actions";

interface LandedCostRun {
  id: string;
  run_no: string;
  status: string;
  total_allocated_minor: string | number;
  created_at: string;
  posted_at?: string;
  shipment_no: string;
  supplier_name?: string;
  posted_by_name?: string;
}

interface DeliveredShipment {
  id: string;
  shipment_no: string;
  supplier_name?: string;
  currency: string;
}

export function LandedCostListClient({
  initialRuns,
  deliveredShipments,
}: {
  initialRuns: LandedCostRun[];
  deliveredShipments: DeliveredShipment[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState(deliveredShipments[0]?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = initialRuns.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        r.run_no.toLowerCase().includes(q) ||
        r.shipment_no.toLowerCase().includes(q) ||
        (r.supplier_name && r.supplier_name.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (selectedStatus !== "all" && r.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentId) return;

    setIsSubmitting(true);
    const res = await createLandedCostRun(selectedShipmentId);
    if (res.success && res.runId) {
      router.push(`/imports/landed-cost/${res.runId}`);
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Landed Cost Runs</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              Section 06 Imports
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cost allocation engine distributing freight, customs duty, port handling and insurance into inventory lot costs.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Landed Cost Run</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search run #, shipment #, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft (Unposted)</option>
            <option value="posted">Posted to Ledger</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> runs
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Run #</th>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total Allocated (GHS)</th>
              <th className="px-4 py-3">Posted By / Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  No landed cost runs found. Click &quot;New Landed Cost Run&quot; to allocate charges for a delivered shipment.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-navy-900">
                    <Link href={`/imports/landed-cost/${r.id}`} className="hover:underline">
                      {r.run_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{r.shipment_no}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{r.supplier_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.status === "posted"
                          ? "bg-emerald-100 text-emerald-800"
                          : r.status === "reversed"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-900">
                    GHS {(Number(r.total_allocated_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.posted_by_name ? (
                      <div>
                        <span className="font-medium text-slate-700">{r.posted_by_name}</span>
                        <span className="block text-[11px] text-slate-400">
                          {r.posted_at ? new Date(r.posted_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/imports/landed-cost/${r.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded text-navy-800 hover:bg-navy-50"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Run Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Scale className="w-4 h-4 text-navy-800" />
              Start Landed Cost Calculation Run
            </h3>
            <p className="text-xs text-slate-500">
              Select a delivered import shipment with verified charges to calculate cost distribution across item lines.
            </p>

            <form onSubmit={handleCreateRun} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Delivered Shipment
                </label>
                {deliveredShipments.length > 0 ? (
                  <select
                    value={selectedShipmentId}
                    onChange={(e) => setSelectedShipmentId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                    required
                  >
                    {deliveredShipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shipment_no} — {s.supplier_name || "Supplier"} ({s.currency})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    No delivered or cleared shipments found awaiting landed-cost calculation.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || deliveredShipments.length === 0}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-navy-800 text-white hover:bg-navy-900 disabled:bg-slate-300"
                >
                  {isSubmitting ? "Calculating..." : "Initialize Draft Run"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
