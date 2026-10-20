"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Filter, ShoppingCart, Calendar, MapPin, Trash2 } from "lucide-react";
import { deleteInternalOrderAction } from "./actions";

export interface OrderRow {
  id: string;
  order_no: string;
  status: string;
  currency: string;
  total_minor: number | string;
  customer_name: string;
  required_by: string | null;
  delivery_point: string | null;
  created_at: string;
}

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  pending_approval: { label: "Pending Approval", bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  approved: { label: "Approved", bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  awaiting_build: { label: "Awaiting Build", bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  ready: { label: "Ready", bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  dispatched: { label: "Dispatched", bg: "bg-cyan-100", text: "text-cyan-800", dot: "bg-cyan-500" },
  completed: { label: "Completed", bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  cancelled: { label: "Cancelled", bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
};

export function OrdersClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const handleDeleteOrder = (order: OrderRow) => {
    const actionLabel = order.status === "draft" ? "delete" : "cancel";
    if (!confirm(`Are you sure you want to ${actionLabel} sales order ${order.order_no}?`)) return;

    startTransition(async () => {
      const res = await deleteInternalOrderAction(order.id);
      if (res.success) {
        if (res.cancelled) {
          setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "cancelled" } : o)));
        } else {
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        }
      } else {
        alert(res.error || "Failed to delete order");
      }
    });
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.delivery_point && o.delivery_point.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalFilteredValue = filteredOrders.reduce((sum, o) => {
    return sum + (typeof o.total_minor === "string" ? parseInt(o.total_minor, 10) : Number(o.total_minor) || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Sales Orders</h1>
          <p className="text-sm text-slate-500">Manage customer purchase orders, reservations, and dispatches.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/orders/new"
            className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Order
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
              placeholder="Search by order #, customer, or destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Statuses ({orders.length})</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="awaiting_build">Awaiting Build</option>
              <option value="ready">Ready</option>
              <option value="dispatched">Dispatched</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Quick summary ribbon */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong className="text-navy-900 font-semibold">{filteredOrders.length}</strong> of {orders.length} orders
          </span>
          {filteredOrders.length > 0 && (
            <span>
              Total Displayed Value:{" "}
              <strong className="text-navy-900 font-semibold font-mono">
                GHS {(totalFilteredValue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Order No</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Customer</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Required By</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px] text-right">Total Amount</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No sales orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const badge = STATUS_BADGES[o.status] || {
                    label: o.status.replace("_", " "),
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    dot: "bg-slate-400",
                  };
                  const amount =
                    typeof o.total_minor === "string" ? parseInt(o.total_minor, 10) : Number(o.total_minor) || 0;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-navy-900">
                        {o.order_no}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{o.customer_name}</div>
                        {o.delivery_point && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 inline" />
                            {o.delivery_point}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {o.required_by ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 inline" />
                            {new Date(o.required_by).toLocaleDateString()}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono font-medium text-slate-800">
                        {o.currency} {(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            href={`/orders/${o.id}`}
                            className="text-gold-600 hover:text-gold-700 font-semibold"
                          >
                            View Order
                          </Link>
                          {o.status !== "completed" && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDeleteOrder(o)}
                              className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                              title={o.status === "draft" ? "Delete Order" : "Cancel Order"}
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
