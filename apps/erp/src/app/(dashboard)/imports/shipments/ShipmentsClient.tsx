"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ship,
  PlusCircle,
  Kanban,
  List,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Anchor,
  Plane,
  Truck,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export interface ShipmentRow {
  id: string;
  shipmentNo: string;
  supplierName: string;
  mode: string;
  status: string;
  incoterm?: string;
  blAwbNo?: string;
  vesselOrFlight?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  etd?: string;
  eta: string;
  originalEta?: string;
  ata?: string;
  freeDays?: number;
  freeDaysStart?: string;
  freeDaysLeft: number | null;
  slippageDays: number;
  currency: string;
  linesCount: number;
  chargesCount: number;
  estimatedChargesCount: number;
  createdAt: string;
}

export function ShipmentsClient({ initialShipments }: { initialShipments: ShipmentRow[] }) {
  const [viewMode, setViewMode] = useState<"list" | "board">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<string>("all");
  const [filterDelayed, setFilterDelayed] = useState(false);
  const [filterHeld, setFilterHeld] = useState(false);
  const [filterDemurrage, setFilterDemurrage] = useState(false);
  const [filterEstimatedCharges, setFilterEstimatedCharges] = useState(false);

  const stages = [
    { id: "booked", label: "Booked", color: "bg-slate-100 text-slate-700 border-slate-300" },
    { id: "in_transit", label: "In Transit", color: "bg-blue-50 text-blue-700 border-blue-300" },
    { id: "arrived", label: "Arrived", color: "bg-indigo-50 text-indigo-700 border-indigo-300" },
    { id: "customs_processing", label: "Customs", color: "bg-purple-50 text-purple-700 border-purple-300" },
    { id: "held", label: "Held", color: "bg-rose-50 text-rose-700 border-rose-300" },
    { id: "cleared", label: "Cleared", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
    { id: "delivered", label: "Delivered", color: "bg-teal-50 text-teal-800 border-teal-300" },
  ];

  const filtered = initialShipments.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        s.shipmentNo.toLowerCase().includes(q) ||
        s.supplierName.toLowerCase().includes(q) ||
        (s.blAwbNo && s.blAwbNo.toLowerCase().includes(q)) ||
        (s.vesselOrFlight && s.vesselOrFlight.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (selectedMode !== "all" && s.mode.toLowerCase() !== selectedMode.toLowerCase()) {
      return false;
    }

    if (filterDelayed && s.slippageDays <= 0) {
      return false;
    }

    if (filterHeld && s.status !== "held") {
      return false;
    }

    if (filterDemurrage && (s.freeDaysLeft === null || s.freeDaysLeft > 3)) {
      return false;
    }

    if (filterEstimatedCharges && s.estimatedChargesCount === 0) {
      return false;
    }

    return true;
  });

  const getModeIcon = (mode: string) => {
    switch (mode.toLowerCase()) {
      case "air":
        return <Plane className="w-3.5 h-3.5" />;
      case "road":
        return <Truck className="w-3.5 h-3.5" />;
      case "sea":
      default:
        return <Ship className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Shipments & Tracking</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              Section 06 Imports
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            End-to-end import pipeline tracking, demurrage risk monitoring, and landed cost management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                viewMode === "board"
                  ? "bg-white text-navy-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-white text-navy-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          <Link
            href="/imports/shipments/new"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Shipment</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search shipment #, BL/AWB, vessel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
            />
          </div>

          {/* Mode Selector */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
          >
            <option value="all">All Modes</option>
            <option value="sea">Sea Freight</option>
            <option value="air">Air Cargo</option>
            <option value="road">Road / Courier</option>
          </select>

          {/* Filter Pills */}
          <button
            onClick={() => setFilterDelayed(!filterDelayed)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
              filterDelayed
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Delayed ({initialShipments.filter((s) => s.slippageDays > 0).length})</span>
          </button>

          <button
            onClick={() => setFilterHeld(!filterHeld)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
              filterHeld
                ? "bg-rose-100 text-rose-800 border-rose-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>Held at Customs ({initialShipments.filter((s) => s.status === "held").length})</span>
          </button>

          <button
            onClick={() => setFilterDemurrage(!filterDemurrage)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
              filterDemurrage
                ? "bg-red-100 text-red-800 border-red-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span>Demurrage Risk (&le; 3d)</span>
          </button>

          <button
            onClick={() => setFilterEstimatedCharges(!filterEstimatedCharges)}
            className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
              filterEstimatedCharges
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>Estimated Charges</span>
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {initialShipments.length} shipments
        </div>
      </div>

      {/* Main View: Board vs List */}
      {viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageShipments = filtered.filter((s) => s.status === stage.id);
            return (
              <div
                key={stage.id}
                className="bg-slate-50/70 p-3 rounded-lg border border-slate-200 flex flex-col min-w-[210px]"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {stage.label}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                    {stageShipments.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-2 flex-1">
                  {stageShipments.length === 0 ? (
                    <div className="flex items-center justify-center h-24 border border-dashed border-slate-200 rounded text-[11px] text-slate-400">
                      Empty
                    </div>
                  ) : (
                    stageShipments.map((shp) => (
                      <Link
                        key={shp.id}
                        href={`/imports/shipments/${shp.id}`}
                        className="block bg-white p-3 rounded-md border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono font-bold text-navy-900 group-hover:text-gold-600 transition-colors">
                            {shp.shipmentNo}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            {getModeIcon(shp.mode)}
                            <span className="uppercase text-[9px]">{shp.mode}</span>
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium truncate mb-2">
                          {shp.supplierName}
                        </p>

                        {/* Milestones & Risk Badges */}
                        <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                          <div className="flex items-center justify-between">
                            <span>ETA:</span>
                            <span className="font-medium text-slate-700">
                              {shp.eta ? new Date(shp.eta).toLocaleDateString() : "—"}
                            </span>
                          </div>

                          {shp.slippageDays > 0 && (
                            <div className="flex items-center justify-between text-amber-700 font-semibold bg-amber-50 px-1 py-0.5 rounded">
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                Slip:
                              </span>
                              <span>+{shp.slippageDays}d</span>
                            </div>
                          )}

                          {shp.freeDaysLeft !== null && (
                            <div
                              className={`flex items-center justify-between px-1 py-0.5 rounded font-semibold ${
                                shp.freeDaysLeft <= 3
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              <span>Free Days:</span>
                              <span>{shp.freeDaysLeft} left</span>
                            </div>
                          )}

                          {shp.estimatedChargesCount > 0 && (
                            <div className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded flex items-center justify-between">
                              <span>Est. charges:</span>
                              <span>{shp.estimatedChargesCount}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Shipment #</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">ETA & Slippage</th>
                <th className="px-4 py-3">Free Days</th>
                <th className="px-4 py-3">Charges Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No shipments match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-navy-900">
                      <Link href={`/imports/shipments/${s.id}`} className="hover:underline">
                        {s.shipmentNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{s.supplierName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5 uppercase text-[11px]">
                        {getModeIcon(s.mode)}
                        <span>{s.mode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          stages.find((st) => st.id === s.status)?.color || "bg-slate-100"
                        }`}
                      >
                        {stages.find((st) => st.id === s.status)?.label || s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">
                          {s.eta ? new Date(s.eta).toLocaleDateString() : "—"}
                        </span>
                        {s.slippageDays > 0 && (
                          <span className="text-[10px] text-amber-600 font-semibold">
                            +{s.slippageDays} days slippage
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.freeDaysLeft !== null ? (
                        <span
                          className={`font-semibold ${
                            s.freeDaysLeft <= 3 ? "text-red-600" : "text-emerald-700"
                          }`}
                        >
                          {s.freeDaysLeft} days left
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.estimatedChargesCount > 0 ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                          {s.estimatedChargesCount} awaiting actual
                        </span>
                      ) : (
                        <span className="text-emerald-700 text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          All actualized
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/imports/shipments/${s.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded text-navy-800 hover:bg-navy-50 transition-colors"
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
      )}
    </div>
  );
}
