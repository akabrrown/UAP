"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sliders,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Trash2,
  Plus,
} from "lucide-react";
import { createAdjustment } from "./actions";

export interface AdjustmentRow {
  id: string;
  adj_no: string;
  reason: string;
  status: string;
  total_value_minor: string | number;
  created_at: string;
  posted_at?: string;
  location_code?: string;
  location_name?: string;
  lines_count: number;
}

interface Location {
  id: string;
  code: string;
  name: string;
}

interface Item {
  id: string;
  sku: string;
  name: string;
}

interface AdjustmentLineInput {
  itemId: string;
  sku: string;
  name: string;
  qtyDelta: number;
  unitCostMinor: number;
  note?: string;
}

export function AdjustmentsClient({
  initialAdjustments,
  locations,
  items,
}: {
  initialAdjustments: AdjustmentRow[];
  locations: Location[];
  items: Item[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [reason, setReason] = useState("count_variance");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<AdjustmentLineInput[]>([]);

  // Item to add in modal
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || "");
  const [qtyDelta, setQtyDelta] = useState<number>(-1);

  const filtered = initialAdjustments.filter((a) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        a.adj_no.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q) ||
        (a.location_code && a.location_code.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (selectedStatus !== "all" && a.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  const handleAddLine = () => {
    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;

    // Default estimate cost GHS 150.00 minor
    const unitCostMinor = 15000;

    setLines([
      ...lines,
      {
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        qtyDelta,
        unitCostMinor,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const totalValueGHS =
    lines.reduce((acc, l) => acc + Math.abs(l.qtyDelta) * (l.unitCostMinor / 100), 0);
  const exceedsThreshold = totalValueGHS > 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      setErrorMessage("Please add at least one line to adjust.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await createAdjustment({
      locationId,
      reason,
      notes,
      lines: lines.map((l) => ({
        itemId: l.itemId,
        qtyDelta: l.qtyDelta,
        unitCostMinor: l.unitCostMinor,
        note: l.note,
      })),
    });

    if (res.success) {
      setShowModal(false);
      setLines([]);
      setNotes("");
      router.refresh();
    } else {
      setErrorMessage(res.error || "Failed to create adjustment.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Stock Adjustments</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              Section 07 Adjustments
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile physical cycle count variances, record transit damage, scrap defective parts, and manage dual-approval write-offs.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Adjustment</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search adjustment #, reason, location..."
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
            <option value="posted">Auto-Posted / Approved</option>
            <option value="pending_approval">Pending Management Approval</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> adjustments
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Adjustment #</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3 text-right">Total Impact Value</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  No stock adjustments found. Click &quot;New Adjustment&quot; to log a variance or write-off.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-bold text-navy-900">{a.adj_no}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-semibold">{a.location_code || "WH-MAIN"}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 capitalize">
                    {a.reason.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.lines_count} lines</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                    GHS {(Number(a.total_value_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        a.status === "posted"
                          ? "bg-emerald-100 text-emerald-800"
                          : a.status === "pending_approval"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {a.status === "pending_approval" ? "Awaiting MG Approval" : a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Sliders className="w-4 h-4 text-navy-800" />
              Record Stock Adjustment / Variance
            </h3>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                  >
                    <option value="count_variance">Cycle Count Variance</option>
                    <option value="damage">Warehouse / Transit Damage</option>
                    <option value="loss">Loss / Shortage</option>
                    <option value="found">Found Stock (Surplus)</option>
                    <option value="scrap">Production Scrap</option>
                    <option value="other">Other Variance</option>
                  </select>
                </div>
              </div>

              {/* Add Line Input */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">Add Component Line</span>
                <div className="flex gap-2">
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="flex-1 text-xs px-3 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.sku} — {i.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={qtyDelta}
                    onChange={(e) => setQtyDelta(Number(e.target.value))}
                    className="w-24 text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                    placeholder="+/- Qty"
                  />

                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-navy-800 text-white hover:bg-navy-900"
                  >
                    Add
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Tip: Use positive values (+5) for found inventory; negative values (-2) for damage or loss.
                </span>
              </div>

              {/* Added Lines Table */}
              {lines.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-right">Adjustment Qty</th>
                        <th className="px-3 py-2 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((l, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-navy-900">{l.sku}</span>
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-bold font-mono ${
                              l.qtyDelta > 0 ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {l.qtyDelta > 0 ? `+${l.qtyDelta}` : l.qtyDelta}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Threshold Banner */}
              <div
                className={`p-3 rounded text-xs flex items-center justify-between ${
                  exceedsThreshold
                    ? "bg-amber-50 border border-amber-200 text-amber-900"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <span>
                  Estimated Impact Value: <strong>GHS {totalValueGHS.toFixed(2)}</strong>
                </span>
                {exceedsThreshold && (
                  <span className="font-semibold text-amber-700">
                    &gt; GHS 500 limit &rarr; Requires Management Approval
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Audit Explanation / Note
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Broken LCD screen during unpacking; logged for scrap write-off."
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || lines.length === 0}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-navy-800 text-white hover:bg-navy-900 disabled:bg-slate-300"
                >
                  {isSubmitting ? "Submitting..." : "Submit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
