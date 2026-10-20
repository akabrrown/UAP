"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ScrollText,
  Search,
  Filter,
  Download,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Building2,
  Calendar,
} from "lucide-react";

export interface LedgerRow {
  id: string;
  posted_at: string;
  movement_type: string;
  qty: string | number;
  unit_cost_minor?: string | number;
  ref_type?: string;
  ref_id?: string;
  reason?: string;
  sku: string;
  item_name: string;
  location_code?: string;
  location_name?: string;
  actor_name?: string;
}

interface LocationOption {
  id: string;
  code: string;
  name: string;
}

interface ItemOption {
  id: string;
  sku: string;
  name: string;
}

export function LedgerClient({
  initialRows,
  locations,
  items,
}: {
  initialRows: LedgerRow[];
  locations: LocationOption[];
  items: ItemOption[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovement, setSelectedMovement] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");

  const filtered = initialRows.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        r.sku.toLowerCase().includes(q) ||
        r.item_name.toLowerCase().includes(q) ||
        (r.reason && r.reason.toLowerCase().includes(q)) ||
        (r.ref_type && r.ref_type.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (selectedMovement !== "all" && r.movement_type !== selectedMovement) {
      return false;
    }

    if (selectedLocation !== "all" && r.location_code !== selectedLocation) {
      return false;
    }

    return true;
  });

  const getMovementBadge = (type: string, qty: number) => {
    switch (type) {
      case "receipt":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ArrowDownRight className="w-3 h-3 text-emerald-600" />
            Receipt (+{qty})
          </span>
        );
      case "dispatch":
      case "issue":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <ArrowUpRight className="w-3 h-3 text-blue-600" />
            {type === "dispatch" ? "Dispatch" : "Issue"} ({qty})
          </span>
        );
      case "transfer_in":
      case "transfer_out":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            Transfer ({qty > 0 ? `+${qty}` : qty})
          </span>
        );
      case "adjustment":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Adjustment ({qty > 0 ? `+${qty}` : qty})
          </span>
        );
      case "scrap":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            Scrap ({qty})
          </span>
        );
      case "service_consume":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            Service Part ({qty})
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
            {type} ({qty})
          </span>
        );
    }
  };

  const getSourceLink = (refType?: string, refId?: string) => {
    if (!refType || !refId) return "—";
    switch (refType) {
      case "goods_receipt":
        return (
          <Link href={`/procurement/grn/${refId}`} className="text-navy-800 hover:underline font-mono">
            GRN #{refId.slice(0, 8)}
          </Link>
        );
      case "transfer":
        return (
          <Link href={`/inventory/transfers/${refId}`} className="text-navy-800 hover:underline font-mono">
            Transfer #{refId.slice(0, 8)}
          </Link>
        );
      case "internal_order":
        return (
          <Link href={`/orders/${refId}`} className="text-navy-800 hover:underline font-mono">
            Order #{refId.slice(0, 8)}
          </Link>
        );
      case "service_ticket":
        return (
          <Link href={`/service/${refId}`} className="text-navy-800 hover:underline font-mono">
            Ticket #{refId.slice(0, 8)}
          </Link>
        );
      default:
        return <span className="font-mono text-slate-500">{refType}</span>;
    }
  };

  const exportCSV = () => {
    const headers = ["Timestamp", "SKU", "Item Name", "Location", "Movement Type", "Qty", "Reason", "Actor"];
    const rows = filtered.map((r) => [
      r.posted_at,
      r.sku,
      `"${r.item_name.replace(/"/g, '""')}"`,
      r.location_code || "",
      r.movement_type,
      r.qty,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
      r.actor_name || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Stock Ledger</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              Immutable &middot; Section 07
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Append-only physical inventory transaction history. Every receipt, transfer, issue, scrap and adjustment is permanently recorded.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Append-Only Notice Banner (Strictly per Section 07) */}
      <div className="bg-navy-900 text-white px-4 py-3 rounded-lg text-xs flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-gold-500 shrink-0" />
          <span>
            <strong>Append-Only Ledger Guarantee:</strong> There are no create, edit, or delete buttons on this page. All ledger entries are generated exclusively by verified operational transactions (GRN posting, dispatch verification, transfer receipt, approved adjustments).
          </span>
        </div>
        <span className="text-[11px] font-mono text-gold-400 uppercase tracking-wider shrink-0 ml-4">
          Audit Compliant
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by SKU, item name, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
            />
          </div>

          <select
            value={selectedMovement}
            onChange={(e) => setSelectedMovement(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
          >
            <option value="all">All Movements</option>
            <option value="receipt">Goods Receipt (GRN)</option>
            <option value="dispatch">Sales Dispatch</option>
            <option value="issue">Production Issue</option>
            <option value="transfer_in">Transfer In</option>
            <option value="transfer_out">Transfer Out</option>
            <option value="adjustment">Stock Adjustment</option>
            <option value="service_consume">Service Part Consumption</option>
            <option value="scrap">Scrap / Defect</option>
          </select>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
          >
            <option value="all">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.code}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> ledger rows
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Item SKU & Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Movement & Quantity</th>
              <th className="px-4 py-3">Source Ref</th>
              <th className="px-4 py-3">Reason / Context</th>
              <th className="px-4 py-3 text-right">Posted By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  No stock ledger entries recorded matching the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(row.posted_at).toLocaleString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-navy-900">{row.sku}</span>
                    <span className="block text-slate-500 text-[11px] truncate max-w-xs">
                      {row.item_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-700">
                      {row.location_code || "WH-MAIN"}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {row.location_name || "Central Warehouse"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getMovementBadge(row.movement_type, Number(row.qty))}
                  </td>
                  <td className="px-4 py-3">
                    {getSourceLink(row.ref_type, row.ref_id)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-xs">
                    {row.reason || "Operational movement"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-[11px]">
                    {row.actor_name || "System"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
