"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Truck, Calendar, ShoppingBag, PackageCheck, Building2, Trash2 } from "lucide-react";
import { deletePurchaseOrderAction } from "./actions";

export interface PurchaseOrderRow {
  id: string;
  po_no: string;
  status: string;
  currency: string;
  total_minor: number | string;
  supplier_name: string;
  shipping_mode: string | null;
  expected_arrival_date: string | null;
  created_at: string;
}

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  pending_approval: { label: "Pending Approval", bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  approved: { label: "Approved", bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  sent: { label: "Sent", bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500" },
  confirmed: { label: "Confirmed", bg: "bg-cyan-100", text: "text-cyan-800", dot: "bg-cyan-500" },
  partly_received: { label: "Partly Received", bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  received: { label: "Received", bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  closed: { label: "Closed", bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  cancelled: { label: "Cancelled", bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
};

export function ProcurementClient({ initialOrders }: { initialOrders: PurchaseOrderRow[] }) {
  const [orders, setOrders] = useState<PurchaseOrderRow[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shippingFilter, setShippingFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const handleDeletePO = (po: PurchaseOrderRow) => {
    const actionLabel = po.status === "draft" ? "delete" : "cancel";
    if (!confirm(`Are you sure you want to ${actionLabel} purchase order ${po.po_no}?`)) return;

    startTransition(async () => {
      const res = await deletePurchaseOrderAction(po.id);
      if (res.success) {
        if (res.cancelled) {
          setOrders((prev) => prev.map((o) => (o.id === po.id ? { ...o, status: "cancelled" } : o)));
        } else {
          setOrders((prev) => prev.filter((o) => o.id !== po.id));
        }
      } else {
        alert(res.error || "Failed to delete purchase order");
      }
    });
  };

  const filteredOrders = orders.filter((po) => {
    const matchesSearch =
      po.po_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    const matchesShipping = shippingFilter === "all" || po.shipping_mode === shippingFilter;

    return matchesSearch && matchesStatus && matchesShipping;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Manage purchasing, imports, and supplier replenishment.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/procurement/new"
            className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create PO
          </Link>
        </div>
      </div>

      {/* Procurement Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <Link
          href="/procurement"
          className="pb-2.5 border-b-2 border-navy-900 text-navy-900 flex items-center gap-2"
        >
          <Truck className="w-4 h-4 text-navy-900" />
          Purchase Orders
        </Link>
        <Link
          href="/procurement/grn"
          className="pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
        >
          <PackageCheck className="w-4 h-4 text-slate-400" />
          Goods Receipts
        </Link>
        <Link
          href="/procurement/suppliers"
          className="pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
        >
          <Building2 className="w-4 h-4 text-slate-400" />
          Suppliers Directory
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search POs by number or supplier..."
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
              <option value="sent">Sent</option>
              <option value="confirmed">Confirmed</option>
              <option value="partly_received">Partly Received</option>
              <option value="received">Received</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={shippingFilter}
              onChange={(e) => setShippingFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none capitalize"
            >
              <option value="all">All Shipping Modes</option>
              <option value="sea">Sea Freight</option>
              <option value="air">Air Cargo</option>
              <option value="road">Road Freight</option>
              <option value="courier">Courier</option>
            </select>
          </div>
        </div>

        {/* Quick summary ribbon */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong className="text-navy-900 font-semibold">{filteredOrders.length}</strong> of {orders.length} purchase orders
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">PO Number</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Supplier</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Mode</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px] text-right">Total Amount</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Expected Arrival</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No purchase orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const badge = STATUS_BADGES[po.status] || {
                    label: po.status.replace("_", " "),
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    dot: "bg-slate-400",
                  };
                  const amount =
                    typeof po.total_minor === "string" ? parseInt(po.total_minor, 10) : Number(po.total_minor) || 0;

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-navy-900">{po.po_no}</td>
                      <td className="px-4 py-3 font-medium text-ink">{po.supplier_name}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">
                        {po.shipping_mode ? (
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-slate-400 inline" />
                            {po.shipping_mode}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono font-medium text-slate-800">
                        {po.currency} {(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {po.expected_arrival_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 inline" />
                            {new Date(po.expected_arrival_date).toLocaleDateString()}
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
                            href={`/procurement/${po.id}`}
                            className="text-gold-600 hover:text-gold-700 font-semibold"
                          >
                            View PO
                          </Link>
                          {po.status !== "closed" && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDeletePO(po)}
                              className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                              title={po.status === "draft" ? "Delete PO" : "Cancel PO"}
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
