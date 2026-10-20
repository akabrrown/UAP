"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Kanban,
  Search,
  Filter,
  Layers,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  ArrowRight,
  User,
} from "lucide-react";

export interface UnitBoardCard {
  id: string;
  internal_ref: string;
  serial_no?: string;
  status: string;
  created_at: string;
  updated_at: string;
  built_at?: string;
  model_sku: string;
  model_name: string;
  assembly_order_no?: string;
  technician_name?: string;
  technician_id?: string;
}

interface ModelOption {
  sku: string;
  name: string;
}

interface TechnicianOption {
  id: string;
  full_name: string;
}

export function ProductionBoardClient({
  initialUnits,
  models,
  technicians,
}: {
  initialUnits: UnitBoardCard[];
  models: ModelOption[];
  technicians: TechnicianOption[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedTech, setSelectedTech] = useState("all");

  const stages = [
    { id: "allocated", label: "Planned (Allocated)", color: "border-slate-300 bg-slate-50 text-slate-700" },
    { id: "building", label: "Building", color: "border-blue-300 bg-blue-50 text-blue-700" },
    { id: "testing", label: "Testing", color: "border-purple-300 bg-purple-50 text-purple-700" },
    { id: "qc_hold", label: "QC Hold", color: "border-amber-300 bg-amber-50 text-amber-800" },
    { id: "rework", label: "Rework", color: "border-rose-300 bg-rose-50 text-rose-800" },
    { id: "passed", label: "QC Passed / Done", color: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  ];

  const filtered = initialUnits.filter((u) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        u.internal_ref.toLowerCase().includes(q) ||
        (u.serial_no && u.serial_no.toLowerCase().includes(q)) ||
        u.model_sku.toLowerCase().includes(q) ||
        (u.assembly_order_no && u.assembly_order_no.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (selectedModel !== "all" && u.model_sku !== selectedModel) {
      return false;
    }

    if (selectedTech !== "all" && u.technician_id !== selectedTech) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Production Kanban Board</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              Live Assembly &middot; Section 08
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time shop floor assembly tracker from kit release and bench assembly to burn-in tests and final QC release.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/production/queue"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Technician Queue</span>
          </Link>
          <Link
            href="/quality/inspections"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>QC Inspection Queue</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search build ref (B-001), serial, order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
            />
          </div>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
          >
            <option value="all">All Computer Models</option>
            {models.map((m) => (
              <option key={m.sku} value={m.sku}>
                {m.sku}
              </option>
            ))}
          </select>

          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
          >
            <option value="all">All Technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Tracking <span className="font-semibold text-slate-700">{filtered.length}</span> units in WIP
        </div>
      </div>

      {/* Live Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageUnits = filtered.filter((u) => u.status === stage.id);
          return (
            <div
              key={stage.id}
              className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 flex flex-col min-w-[200px]"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {stage.label}
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                  {stageUnits.length}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                {stageUnits.length === 0 ? (
                  <div className="flex items-center justify-center h-20 border border-dashed border-slate-200 rounded text-[11px] text-slate-400">
                    No units
                  </div>
                ) : (
                  stageUnits.map((u) => (
                    <Link
                      key={u.id}
                      href={`/production/units/${u.id}`}
                      className="block bg-white p-3 rounded-md border border-slate-200 hover:border-navy-800 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-navy-900 group-hover:text-gold-600 transition-colors">
                          {u.internal_ref}
                        </span>
                        {u.serial_no && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-semibold">
                            PASSED
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-slate-800 truncate mb-1">
                        {u.model_sku}
                      </p>

                      <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-1.5">
                        <div className="flex items-center justify-between">
                          <span>Order:</span>
                          <span className="font-mono text-slate-700">{u.assembly_order_no || "Stock"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Tech:</span>
                          <span className="text-slate-700 font-medium truncate max-w-[100px]">
                            {u.technician_name || "Unassigned"}
                          </span>
                        </div>
                        {u.serial_no && (
                          <div className="text-[10px] font-mono text-navy-900 truncate mt-1">
                            {u.serial_no}
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
    </div>
  );
}
