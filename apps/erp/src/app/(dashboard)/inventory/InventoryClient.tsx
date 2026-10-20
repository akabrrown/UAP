"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Layers, ArrowLeftRight, History, Package, ShieldCheck } from "lucide-react";

interface StockBalanceRow {
  item_id: string;
  sku: string;
  item_name: string;
  uom: string;
  location_id: string;
  location_name: string;
  location_kind: string;
  on_hand_qty: number;
  reserved_qty: number;
  unit_cost_minor: number;
}

interface StockMovementRow {
  id: string;
  posted_at: string;
  movement_type: string;
  qty: number;
  unit_cost_minor: number | null;
  ref_type: string | null;
  sku: string;
  item_name: string;
  location_name: string;
}

interface TransferRow {
  id: string;
  transfer_no: string;
  status: string;
  created_at: string;
  from_location: string | null;
  to_location: string | null;
  line_count: number;
}

interface InventoryClientProps {
  stockBalances: StockBalanceRow[];
  stockMovements: StockMovementRow[];
  transfers: TransferRow[];
  metrics: {
    totalSkus: number;
    totalOnHand: number;
    totalReserved: number;
    inTransitTransfers: number;
  };
}

export function InventoryClient({
  stockBalances,
  stockMovements,
  transfers,
  metrics,
}: InventoryClientProps) {
  const [activeTab, setActiveTab] = useState<"balances" | "movements" | "transfers">("balances");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  const uniqueLocations = Array.from(new Set(stockBalances.map((b) => b.location_name)));

  const filteredBalances = stockBalances.filter((b) => {
    const matchesSearch =
      b.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLoc = locationFilter === "all" || b.location_name === locationFilter;
    return matchesSearch && matchesLoc;
  });

  const filteredMovements = stockMovements.filter((m) => {
    return (
      m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.movement_type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredTransfers = transfers.filter((t) => {
    return (
      t.transfer_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.from_location && t.from_location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.to_location && t.to_location.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500">Live multi-location stock levels, append-only ledger, and transfers.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/transfers/new"
            className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Transfer
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>SKUs in Stock</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-ink tabular">{metrics.totalSkus}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Total Units on Hand</span>
            <Layers className="w-4 h-4 text-navy-800" />
          </div>
          <div className="text-xl font-bold text-navy-900 tabular">
            {metrics.totalOnHand.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Active Holds & Reserved</span>
            <ShieldCheck className="w-4 h-4 text-gold-600" />
          </div>
          <div className="text-xl font-bold text-gold-700 tabular">
            {metrics.totalReserved.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>In-Transit Transfers</span>
            <ArrowLeftRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-ink tabular">{metrics.inTransitTransfers}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("balances")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "balances"
              ? "border-navy-900 text-navy-900"
              : "border-transparent text-slate-500 hover:text-ink"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Stock On Hand ({stockBalances.length})
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "transfers"
              ? "border-navy-900 text-navy-900"
              : "border-transparent text-slate-500 hover:text-ink"
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Transfers ({transfers.length})
        </button>
        <button
          onClick={() => setActiveTab("movements")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "movements"
              ? "border-navy-900 text-navy-900"
              : "border-transparent text-slate-500 hover:text-ink"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Ledger Movements ({stockMovements.length})
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === "balances"
                  ? "Search by SKU or item name..."
                  : activeTab === "transfers"
                  ? "Search by transfer number or location..."
                  : "Search movements..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-xs"
            />
          </div>

          {activeTab === "balances" && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
              >
                <option value="all">All Locations</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Live Stock on Hand */}
        {activeTab === "balances" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">SKU</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Item Description</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Location</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">On Hand</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Reserved</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Available</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Valuation (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No stock records found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((b) => {
                    const available = Math.max(0, b.on_hand_qty - b.reserved_qty);
                    const valGhs = (Number(b.on_hand_qty) * Number(b.unit_cost_minor)) / 100;
                    return (
                      <tr key={`${b.item_id}-${b.location_id}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-navy-900">{b.sku}</td>
                        <td className="px-4 py-3 text-ink font-medium">{b.item_name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            {b.location_name}
                            <span className="text-[10px] text-slate-400 capitalize">({b.location_kind})</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-ink tabular">
                          {Number(b.on_hand_qty).toLocaleString()} {b.uom}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gold-700 tabular">
                          {Number(b.reserved_qty).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-green-700 tabular">
                          {available.toLocaleString()} {b.uom}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600 tabular">
                          ₵{valGhs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Stock Transfers */}
        {activeTab === "transfers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Transfer No</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Origin Location</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Destination</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-center">Lines</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      No stock transfers found.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-navy-900">{t.transfer_no}</td>
                      <td className="px-4 py-3 text-ink">{t.from_location || "—"}</td>
                      <td className="px-4 py-3 text-ink">{t.to_location || "—"}</td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">{t.line_count}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                            t.status === "received"
                              ? "bg-green-100 text-green-700"
                              : t.status === "in_transit"
                              ? "bg-blue-100 text-blue-700"
                              : t.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/inventory/transfers/${t.id}`}
                          className="text-gold-600 hover:text-gold-700 font-semibold"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Append-Only Stock Movements */}
        {activeTab === "movements" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Timestamp</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Movement Type</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">SKU</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Item Name</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Location</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      No recent ledger movements recorded.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const isPositive = Number(m.qty) > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                          {new Date(m.posted_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 uppercase">
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-navy-900">{m.sku}</td>
                        <td className="px-4 py-3 text-ink font-medium">{m.item_name}</td>
                        <td className="px-4 py-3 text-slate-600">{m.location_name}</td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-semibold tabular ${
                            isPositive ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {isPositive ? `+${Number(m.qty).toLocaleString()}` : Number(m.qty).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
