"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Boxes,
  Clock,
  Cpu,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

interface UnitQueueItem {
  id: string;
  internal_ref: string;
  status: string;
  created_at: string;
  built_at?: string;
  built_by?: string;
  model_sku: string;
  model_name: string;
  assembly_order_no?: string;
  built_by_name?: string;
}

interface IncomingQueueItem {
  id: string;
  grn_no: string;
  received_date: string;
  sku: string;
  item_name: string;
  qty_received: string | number;
  supplier_name?: string;
}

export function InspectionsQueueClient({
  unitsQueue,
  incomingQueue,
  currentUserId,
}: {
  unitsQueue: UnitQueueItem[];
  incomingQueue: IncomingQueueItem[];
  currentUserId: string;
}) {
  const [activeTab, setActiveTab] = useState<"units" | "incoming">("units");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Quality Inspections Queue</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              QC Inspector Landing &middot; Section 08
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Independent dual-custody quality gate for finished computer laptops and inbound component receiving lines.
          </p>
        </div>

        <Link
          href="/quality/rework"
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Rework Order Queue</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("units")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "units"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Finished Computer Units Awaiting QC ({unitsQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("incoming")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "incoming"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Incoming Receiving Inspections ({incomingQueue.length})</span>
        </button>
      </div>

      {/* Units Queue Tab */}
      {activeTab === "units" && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Build Ref</th>
                <th className="px-4 py-3">Computer Model</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Assembled By</th>
                <th className="px-4 py-3">Handover Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Inspect Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unitsQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No units currently in QC hold queue.
                  </td>
                </tr>
              ) : (
                unitsQueue.map((u) => {
                  const isBuilder = u.built_by === currentUserId;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-navy-900">
                        {u.internal_ref}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{u.model_sku}</span>
                        <span className="block text-slate-500 text-[11px] truncate max-w-xs">
                          {u.model_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {u.assembly_order_no || "Stock"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {u.built_by_name || "Technician"}
                        {isBuilder && (
                          <span className="block text-[10px] text-amber-700 font-semibold">
                            (Built by you)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {u.built_at ? new Date(u.built_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/quality/inspections/${u.id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded shadow-sm transition-colors ${
                            isBuilder
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none"
                              : "bg-navy-800 hover:bg-navy-900 text-white"
                          }`}
                        >
                          <span>{isBuilder ? "Dual-Custody Block" : "Inspect Unit"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Incoming Queue Tab */}
      {activeTab === "incoming" && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">GRN #</th>
                <th className="px-4 py-3">Supplier Origin</th>
                <th className="px-4 py-3">Component SKU & Description</th>
                <th className="px-4 py-3 text-right">Received Qty</th>
                <th className="px-4 py-3">Date Received</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incomingQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No inbound goods receipt lines awaiting incoming inspection.
                  </td>
                </tr>
              ) : (
                incomingQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-navy-900">
                      {item.grn_no}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {item.supplier_name || "Supplier"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{item.sku}</span>
                      <span className="block text-slate-500 text-[11px] truncate max-w-xs">
                        {item.item_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {Number(item.qty_received).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.received_date}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded text-xs font-semibold">
                        Awaiting Inbound Inspection
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
