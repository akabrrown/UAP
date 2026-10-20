"use client";

import { useState } from "react";
import { AlertCircle, Download, Search, Filter, ShieldAlert, BarChart3 } from "lucide-react";

export interface DefectItem {
  id: string;
  code: string;
  name: string;
  category: string;
  severity: "critical" | "major" | "minor";
  model_name: string;
  unit_ref: string | null;
  notes: string;
  created_at: string;
}

export function DefectsClient({ defects }: { defects: DefectItem[] }) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = defects.filter((d) => {
    if (severityFilter !== "all" && d.severity !== severityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.model_name.toLowerCase().includes(q) ||
        (d.unit_ref && d.unit_ref.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const criticalCount = defects.filter((d) => d.severity === "critical").length;
  const majorCount = defects.filter((d) => d.severity === "major").length;
  const minorCount = defects.filter((d) => d.severity === "minor").length;

  const handleExportCSV = () => {
    const headers = ["Defect ID", "Code", "Name", "Category", "Severity", "Model", "Unit Ref", "Date", "Notes"];
    const rows = filtered.map((d) => [
      d.id,
      d.code,
      `"${d.name.replace(/"/g, '""')}"`,
      d.category,
      d.severity,
      `"${d.model_name.replace(/"/g, '""')}"`,
      d.unit_ref || "Incoming/Batch",
      new Date(d.created_at).toLocaleDateString(),
      `"${d.notes.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uap-defects-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Defects Logged</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{defects.length}</div>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-800">Critical Severity</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{criticalCount}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">Major Severity</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{majorCount}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">Minor Severity</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{minorCount}</div>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {["all", "critical", "major", "minor"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                severityFilter === sev
                  ? "bg-[#0b192c] text-[#f4b41a]"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, model, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
            />
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 whitespace-nowrap shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Defects Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Defect Code</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Affected Model / Unit</th>
              <th className="px-4 py-3">Logged Date</th>
              <th className="px-4 py-3">Details / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                  No defects found matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <span className="font-mono text-xs">{d.code}</span>
                    <div className="text-xs font-normal text-slate-600">{d.name}</div>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-600">
                    {d.category || "General"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                        d.severity === "critical"
                          ? "bg-rose-100 text-rose-800"
                          : d.severity === "major"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {d.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium text-slate-800">{d.model_name}</div>
                    {d.unit_ref && (
                      <div className="font-mono text-[11px] text-slate-500">{d.unit_ref}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700 max-w-sm">
                    {d.notes || "—"}
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
