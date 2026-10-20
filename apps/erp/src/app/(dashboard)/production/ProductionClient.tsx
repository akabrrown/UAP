"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Wrench, Calendar, AlertCircle, Trash2 } from "lucide-react";
import { deleteAssemblyOrderAction } from "./actions";

export interface AssemblyOrderRow {
  id: string;
  ao_no: string;
  status: string;
  qty: number;
  model_name: string;
  sku?: string;
  priority: number;
  purpose: string;
  planned_date: string | null;
  planned_end: string | null;
  created_at: string;
}

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  planned: { label: "Planned", bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  awaiting_materials: { label: "Awaiting Materials", bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  ready: { label: "Ready", bg: "bg-teal-100", text: "text-teal-800", dot: "bg-teal-500" },
  released: { label: "Released", bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500" },
  in_progress: { label: "In Progress", bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  in_qc: { label: "In QC", bg: "bg-cyan-100", text: "text-cyan-800", dot: "bg-cyan-500" },
  completed: { label: "Completed", bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  on_hold: { label: "On Hold", bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
  cancelled: { label: "Cancelled", bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

const PRIORITY_LABELS: Record<number, { label: string; badge: string }> = {
  1: { label: "P1 Critical", badge: "bg-rose-100 text-rose-800 border-rose-300" },
  2: { label: "P2 High", badge: "bg-orange-100 text-orange-800 border-orange-300" },
  3: { label: "P3 Normal", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  4: { label: "P4 Low", badge: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

export function ProductionClient({ initialOrders }: { initialOrders: AssemblyOrderRow[] }) {
  const [orders, setOrders] = useState<AssemblyOrderRow[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const handleDeleteAO = (ao: AssemblyOrderRow) => {
    const actionLabel = ao.status === "draft" ? "delete" : "cancel";
    if (!confirm(`Are you sure you want to ${actionLabel} assembly order ${ao.ao_no}?`)) return;

    startTransition(async () => {
      const res = await deleteAssemblyOrderAction(ao.id);
      if (res.success) {
        if (res.cancelled) {
          setOrders((prev) => prev.map((o) => (o.id === ao.id ? { ...o, status: "cancelled" } : o)));
        } else {
          setOrders((prev) => prev.filter((o) => o.id !== ao.id));
        }
      } else {
        alert(res.error || "Failed to delete assembly order");
      }
    });
  };

  const filteredOrders = orders.filter((ao) => {
    const matchesSearch =
      ao.ao_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ao.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ao.sku && ao.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || ao.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || String(ao.priority) === priorityFilter;
    const matchesPurpose = purposeFilter === "all" || ao.purpose === purposeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesPurpose;
  });

  const totalPlannedUnits = filteredOrders.reduce((sum, ao) => sum + (Number(ao.qty) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Production & Assembly</h1>
          <p className="text-sm text-slate-500">Manage assembly work orders, line scheduling, and batch completion.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/production/new"
            className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Assembly Order
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by AO #, product model, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Statuses ({orders.length})</option>
              <option value="draft">Draft</option>
              <option value="planned">Planned</option>
              <option value="awaiting_materials">Awaiting Materials</option>
              <option value="ready">Ready</option>
              <option value="released">Released</option>
              <option value="in_progress">In Progress</option>
              <option value="in_qc">In QC</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="1">P1 Critical</option>
              <option value="2">P2 High</option>
              <option value="3">P3 Normal</option>
              <option value="4">P4 Low</option>
            </select>

            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Purposes</option>
              <option value="stock">Build for Stock</option>
              <option value="internal_order">Build for Sales Order</option>
            </select>
          </div>
        </div>

        {/* Quick summary ribbon */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong className="text-navy-900 font-semibold">{filteredOrders.length}</strong> of {orders.length} assembly orders
          </span>
          {filteredOrders.length > 0 && (
            <span>
              Total Units in View:{" "}
              <strong className="text-navy-900 font-semibold font-mono">
                {totalPlannedUnits.toLocaleString()} units
              </strong>
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">AO Number</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Product Model</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Priority</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Purpose</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px] text-right">Planned Qty</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Planned Start</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No assembly orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ao) => {
                  const badge = STATUS_BADGES[ao.status] || {
                    label: ao.status.replace("_", " "),
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    dot: "bg-slate-400",
                  };
                  const prio = PRIORITY_LABELS[ao.priority] || {
                    label: `P${ao.priority}`,
                    badge: "bg-slate-100 text-slate-700 border-slate-300",
                  };

                  return (
                    <tr key={ao.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-navy-900">{ao.ao_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{ao.model_name}</div>
                        {ao.sku && <div className="text-[11px] text-slate-500 font-mono">{ao.sku}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${prio.badge}`}>
                          {prio.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 capitalize">
                        {ao.purpose === "internal_order" ? "Sales Order" : "Stock"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                        {ao.qty}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {ao.planned_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 inline" />
                            {new Date(ao.planned_date).toLocaleDateString()}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${badge.bg} ${badge.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/production/${ao.id}`}
                            className="text-gold-600 hover:text-gold-700 font-semibold"
                          >
                            View AO
                          </Link>
                          {ao.status !== "completed" && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDeleteAO(ao)}
                              className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                              title={ao.status === "draft" ? "Delete AO" : "Cancel AO"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
