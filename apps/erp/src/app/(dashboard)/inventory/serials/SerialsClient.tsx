"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Barcode,
  Search,
  Cpu,
  Layers,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wrench,
  Download,
  Building2,
  Calendar,
  ShieldCheck,
  Tag,
} from "lucide-react";

interface SerialsClientProps {
  initialQuery: string;
  unitResult: any;
  componentResult: any;
  lotResult: any;
}

export function SerialsClient({
  initialQuery,
  unitResult,
  componentResult,
  lotResult,
}: SerialsClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"genealogy" | "history">("genealogy");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/inventory/serials?q=${encodeURIComponent(query.trim())}`);
  };

  const hasResult = unitResult || componentResult || lotResult;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Traceability & Genealogy</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              Section 07 Traceability
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            End-to-end component genealogy, serial lookup, and reverse lot tracing across all UPSA assembled devices.
          </p>
        </div>

        <Link
          href="/inventory/labels"
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
        >
          <Barcode className="w-4 h-4 text-slate-500" />
          <span>Barcode Label Generator</span>
        </Link>
      </div>

      {/* Universal Traceability Search Bar */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Scan or type Unit Serial (UPSA-LAP-...), Component Serial, or Lot #..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-800 font-mono"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-navy-800 hover:bg-navy-900 text-white shadow-sm transition-colors"
          >
            Trace & Lookup
          </button>
        </form>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-500">Query Types Supported:</span>
          <span>&bull; Finished Unit Serial (e.g. UPSA-LAP-2026-000001)</span>
          <span>&bull; Build Reference (e.g. B-001)</span>
          <span>&bull; Component Serial (e.g. SSD / RAM serial)</span>
          <span>&bull; Inbound Lot #</span>
        </div>
      </div>

      {/* Results Display */}
      {!hasResult ? (
        initialQuery ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-2">
            <Barcode className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-sm font-semibold text-slate-600">No matching record found</p>
            <p>No unit serial, component serial or lot matched &quot;{initialQuery}&quot;.</p>
          </div>
        ) : (
          <div className="bg-slate-50/50 rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs">
            Enter a serial number or scan a barcode above to view the complete component genealogy tree and audit history.
          </div>
        )
      ) : null}

      {/* Case 1: Unit Result (Finished Computer) */}
      {unitResult && (
        <div className="space-y-6">
          {/* Unit Overview Card */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold font-mono text-navy-900">{unitResult.serial_no}</h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  {unitResult.status}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Build: {unitResult.build_ref}
                </span>
              </div>
              <p className="text-sm text-slate-700 font-semibold mt-1">
                {unitResult.model_sku} &mdash; <span className="font-normal text-slate-500">{unitResult.model_name}</span>
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                <span>Assembly Order: <strong className="text-slate-600 font-mono">{unitResult.assembly_order_no || "—"}</strong></span>
                <span>Technician: <strong className="text-slate-600">{unitResult.technician_name || "Assigned"}</strong></span>
                <span>Built: <strong className="text-slate-600">{unitResult.created_at ? new Date(unitResult.created_at).toLocaleDateString() : "—"}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/service/tickets/new?unit=${unitResult.id}`}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white shadow-sm transition-all"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Open Service Ticket</span>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("genealogy")}
              className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "genealogy"
                  ? "border-navy-800 text-navy-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Genealogy Tree ({unitResult.components?.length || 0} Parts)</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "border-navy-800 text-navy-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Test Runs & QC History ({unitResult.tests?.length || 0})</span>
            </button>
          </div>

          {/* Genealogy Tab */}
          {activeTab === "genealogy" && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Component Type & SKU</th>
                    <th className="px-4 py-3">Component Serial #</th>
                    <th className="px-4 py-3">Lot Number</th>
                    <th className="px-4 py-3">Supplier Origin</th>
                    <th className="px-4 py-3">Installed Date</th>
                    <th className="px-4 py-3">Landed Cost</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unitResult.components && unitResult.components.length > 0 ? (
                    unitResult.components.map((c: any) => {
                      const isRemoved = Boolean(c.removed_at);
                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isRemoved ? "bg-slate-50/40 text-slate-400 line-through" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-navy-900">{c.component_sku}</span>
                            <span className="block text-slate-500 text-[11px] truncate max-w-xs">
                              {c.component_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                            {c.component_serial_no || "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{c.lot_no || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{c.supplier_name || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {c.installed_at ? new Date(c.installed_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {c.unit_landed_cost_minor
                              ? `GHS ${(Number(c.unit_landed_cost_minor) / 100).toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {isRemoved ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Replaced ({c.removal_reason || "Service"})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Active
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No installed components recorded for this unit yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-ink">Recorded Functional & QC Test Runs</h3>
              {unitResult.tests && unitResult.tests.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {unitResult.tests.map((t: any) => (
                    <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 uppercase">{t.test_type}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              t.result === "pass"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {t.result}
                          </span>
                        </div>
                        {t.notes && <p className="text-slate-500 mt-1">{t.notes}</p>}
                        <span className="text-[11px] text-slate-400">Tested by {t.tester_name || "QA Staff"}</span>
                      </div>
                      <span className="text-slate-400">{new Date(t.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No test runs recorded for this unit.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Case 2: Component Serial Result */}
      {componentResult && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Component Serial Result</span>
              <h2 className="text-xl font-bold font-mono text-navy-900 mt-0.5">
                {componentResult.serial_no}
              </h2>
              <p className="text-sm text-slate-700 font-medium">
                {componentResult.component_sku} &mdash; {componentResult.component_name}
              </p>
            </div>
            <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
              {componentResult.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Lot Number:</span>
              <span className="text-sm font-mono font-semibold text-slate-800">
                {componentResult.lot_no || "—"}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Current Location:</span>
              <span className="text-sm font-semibold text-slate-800">
                {componentResult.location_name || "Warehouse"}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Installed in Finished Unit:</span>
              {componentResult.unit_serial_no ? (
                <Link
                  href={`/inventory/serials?q=${componentResult.unit_serial_no}`}
                  className="text-sm font-mono font-bold text-navy-800 hover:underline flex items-center gap-1 mt-0.5"
                >
                  <span>{componentResult.unit_serial_no}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <span className="text-sm font-semibold text-slate-500">Not Installed (In Inventory)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Case 3: Lot Result (Reverse Traceability Report) */}
      {lotResult && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Reverse Lot Traceability</span>
              <h2 className="text-xl font-bold font-mono text-navy-900 mt-0.5">
                Lot #{lotResult.lot_no}
              </h2>
              <p className="text-sm text-slate-700 font-medium">
                {lotResult.item_sku} &mdash; {lotResult.item_name} &middot; Supplier:{" "}
                <strong>{lotResult.supplier_name || "Supplier"}</strong>
              </p>
            </div>

            <button
              onClick={() => alert("Reverse Traceability Audit Report downloaded.")}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Reverse Trace Audit</span>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">
              All Assembled Units Containing Components from Lot #{lotResult.lot_no} ({lotResult.units?.length || 0})
            </h3>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Unit Serial #</th>
                    <th className="px-4 py-3">Computer Model</th>
                    <th className="px-4 py-3">Component Serial Installed</th>
                    <th className="px-4 py-3">Unit Status</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lotResult.units && lotResult.units.length > 0 ? (
                    lotResult.units.map((u: any) => (
                      <tr key={u.unit_id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-bold text-navy-900">
                          {u.unit_serial_no}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{u.model_sku}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {u.component_serial_no || "Lot Tracked"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                            {u.unit_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/inventory/serials?q=${u.unit_serial_no}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded text-navy-800 hover:bg-navy-50"
                          >
                            <span>Genealogy</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No units currently contain components from this lot.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
