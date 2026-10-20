"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scale,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  Ship,
  TrendingUp,
} from "lucide-react";
import { postLandedCostRun, reverseLandedCostRun } from "../actions";

interface LandedCostDetailClientProps {
  run: {
    id: string;
    run_no: string;
    status: string;
    total_allocated_minor: string | number;
    notes?: string;
    created_at: string;
    posted_at?: string;
    reversed_at?: string;
    shipment_id: string;
    shipment_no: string;
    currency: string;
    supplier_name?: string;
    posted_by_name?: string;
  };
  lines: Array<{
    line_id: string;
    item_id: string;
    qty_shipped: string | number;
    unit_value_minor: string | number;
    currency: string;
    sku: string;
    item_name: string;
    allocated_charges_minor: string | number;
  }>;
  charges: Array<{
    id: string;
    charge_type: string;
    description?: string;
    amount_minor: string | number;
    currency: string;
    amount_base_minor: string | number;
    allocation_basis: string;
    status: string;
  }>;
}

export function LandedCostDetailClient({
  run,
  lines,
  charges,
}: LandedCostDetailClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  const handlePost = async () => {
    if (!confirm("Are you sure you want to post this landed cost run to the inventory ledger? This will permanently update item lot costs and post accounting accruals.")) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const res = await postLandedCostRun(run.id);
    if (res.success) {
      router.refresh();
    } else {
      setErrorMessage(res.error || "Failed to post landed cost run.");
    }
    setIsProcessing(false);
  };

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reverseReason.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const res = await reverseLandedCostRun(run.id, reverseReason);
    if (res.success) {
      setShowReverseModal(false);
      router.refresh();
    } else {
      setErrorMessage(res.error || "Failed to reverse landed cost run.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/imports/landed-cost"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Landed Cost Runs</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-ink">{run.run_no}</h1>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                run.status === "posted"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : run.status === "reversed"
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : "bg-amber-100 text-amber-800 border-amber-300"
              }`}
            >
              {run.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Linked Shipment:{" "}
            <Link
              href={`/imports/shipments/${run.shipment_id}`}
              className="font-mono font-semibold text-navy-800 hover:underline"
            >
              {run.shipment_no}
            </Link>{" "}
            &middot; Supplier:{" "}
            <span className="font-semibold text-slate-700">{run.supplier_name || "—"}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {run.status === "draft" && (
            <button
              onClick={handlePost}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Post Landed Cost to Ledger</span>
            </button>
          )}

          {run.status === "posted" && (
            <button
              onClick={() => setShowReverseModal(true)}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reverse Run</span>
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Freight & Customs Charges</span>
          <p className="text-xl font-bold text-navy-900 mt-1">
            GHS {(Number(run.total_allocated_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {charges.length} verified charge line(s)
          </span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Items Being Costed</span>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {lines.length} Catalog Components
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Distributed via proportional value basis
          </span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Posting Status</span>
          <p className="text-sm font-semibold text-slate-800 mt-2">
            {run.status === "posted" ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Active in inv.item_cost_history
              </span>
            ) : run.status === "reversed" ? (
              <span className="text-rose-700">Reversed</span>
            ) : (
              <span className="text-amber-700">Draft Calculation (Ready to Post)</span>
            )}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {run.posted_by_name ? `Posted by ${run.posted_by_name}` : "Pending confirmation"}
          </span>
        </div>
      </div>

      {/* Allocation Breakdown Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold text-ink">Component Landed Cost Allocation Table</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Per-unit landed cost breakdown showing original purchase cost, allocated freight/duties, and total inventory cost per piece.
          </p>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Component SKU</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Shipped Qty</th>
                <th className="px-4 py-3 text-right">PO Unit Price</th>
                <th className="px-4 py-3 text-right">Goods Value (GHS)</th>
                <th className="px-4 py-3 text-right">Allocated Charges (GHS)</th>
                <th className="px-4 py-3 text-right">Total Landed Cost (GHS)</th>
                <th className="px-4 py-3 text-right">Unit Landed Cost (GHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l) => {
                const qty = Number(l.qty_shipped) || 1;
                const poUnit = Number(l.unit_value_minor) / 100;
                const goodsVal = poUnit * qty * 15.5; // conversion estimate for base GHS
                const allocatedCharges = Number(l.allocated_charges_minor) / 100;
                const totalLanded = goodsVal + allocatedCharges;
                const unitLanded = totalLanded / qty;

                return (
                  <tr key={l.line_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-semibold text-navy-900">{l.sku}</td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-xs">{l.item_name}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {qty.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {l.currency} {poUnit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {goodsVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 font-medium">
                      +{allocatedCharges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {totalLanded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-navy-900 bg-slate-50/50">
                      GHS {unitLanded.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reverse Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              Reverse Landed Cost Run
            </h3>
            <p className="text-xs text-slate-500">
              Section 06 Workflow: Reversing a landed cost run requires an audit reason. This will restore previous inventory item valuations.
            </p>
            <form onSubmit={handleReverse} className="space-y-3">
              <textarea
                rows={3}
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="e.g. Invoiced freight charge had billing error; revised run to be created."
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReverseModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !reverseReason.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300"
                >
                  Confirm Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
