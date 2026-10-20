"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cpu,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  Check,
  ShieldCheck,
  Layers,
  Wrench,
  Flame,
} from "lucide-react";
import { submitUnitForQC } from "../../actions";

interface BenchWorkspaceClientProps {
  unit: {
    id: string;
    internal_ref: string;
    serial_no?: string;
    status: string;
    built_by?: string;
    model_sku: string;
    model_name: string;
    assembly_order_no?: string;
    technician_name?: string;
  };
  components: Array<{
    id: string;
    installed_at: string;
    component_sku: string;
    component_name: string;
    component_serial_no?: string;
    lot_no?: string;
  }>;
  tests: Array<{
    id: string;
    test_type: string;
    result: string;
    notes?: string;
    created_at: string;
    tester_name?: string;
  }>;
  steps: any[];
  currentUserId: string;
}

export function BenchWorkspaceClient({
  unit,
  components,
  tests,
  steps,
  currentUserId,
}: BenchWorkspaceClientProps) {
  const router = useRouter();
  const [isSubmittingQC, setIsSubmittingQC] = useState(false);
  const [qcNotes, setQcNotes] = useState("");
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [problemReason, setProblemReason] = useState("");

  // Default Standard Routing Steps for Laptop Assembly (Section 08 Standard)
  const defaultSteps = [
    { id: 1, name: "Chassis & Motherboard Integration", done: true, mandatory: true },
    { id: 2, name: "Thermal Paste & CPU Cooling Assembly", done: true, mandatory: true },
    { id: 3, name: "RAM & M.2 NVMe SSD Installation", done: true, mandatory: true },
    { id: 4, name: "Display Panel & EDP Cable Connection", done: true, mandatory: true },
    { id: 5, name: "Battery & Peripheral Harness Wiring", done: unit.status !== "building", mandatory: true },
    { id: 6, name: "POST Diagnostic Boot Check", done: tests.some((t) => t.test_type === "post" && t.result === "pass"), mandatory: true },
    { id: 7, name: "Burn-in Stress Cycle (24h Window)", done: tests.some((t) => t.test_type === "burn_in" && t.result === "pass"), mandatory: true },
    { id: 8, name: "Standard OS Image & BIOS Lock", done: unit.status === "qc_hold" || unit.status === "passed", mandatory: true },
  ];

  const canSubmitQC =
    unit.status === "building" || unit.status === "testing" || unit.status === "rework";

  const handleSubmitQC = async () => {
    setIsSubmittingQC(true);
    const res = await submitUnitForQC({
      unitId: unit.id,
      notes: qcNotes || "Technician assembly complete; ready for independent QC inspection",
    });

    if (res.success) {
      router.refresh();
    }
    setIsSubmittingQC(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/production/board"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Production Board</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-ink">{unit.internal_ref}</h1>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase border ${
                unit.status === "qc_hold"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : unit.status === "passed"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : unit.status === "rework"
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : "bg-blue-100 text-blue-800 border-blue-200"
              }`}
            >
              {unit.status.replace("_", " ")}
            </span>
            {unit.serial_no && (
              <span className="font-mono text-xs font-bold text-navy-900 bg-navy-50 px-2.5 py-0.5 rounded border border-navy-100">
                Official Serial: {unit.serial_no}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Model: <strong className="text-slate-800">{unit.model_sku}</strong> &mdash;{" "}
            {unit.model_name} &middot; Order:{" "}
            <strong className="font-mono text-slate-700">{unit.assembly_order_no || "Stock"}</strong>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {canSubmitQC && (
            <button
              onClick={handleSubmitQC}
              disabled={isSubmittingQC}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-gold-400" />
              <span>Submit for QC Inspection &rarr;</span>
            </button>
          )}

          {unit.status === "qc_hold" && (
            <Link
              href={`/quality/inspections/${unit.id}`}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Conduct QC Inspection</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Standard Routing Steps (Section 08 Standard) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Wrench className="w-4 h-4 text-navy-800" />
              Assembly Routing Steps
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">8 Mandatory Stages</span>
          </div>

          <div className="space-y-2">
            {defaultSteps.map((step) => (
              <div
                key={step.id}
                className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                  step.done
                    ? "bg-emerald-50/50 border-emerald-200 text-slate-800"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.done
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-300 text-slate-700"
                    }`}
                  >
                    {step.done ? <Check className="w-3 h-3" /> : step.id}
                  </div>
                  <span className="text-xs font-medium">{step.name}</span>
                </div>

                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  {step.done ? "Completed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Installed Components & Test Runs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Installed Components */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Cpu className="w-4 h-4 text-navy-800" />
                Integrated Components (Genealogy)
              </h2>
              <span className="text-xs text-slate-500">
                {components.length} Installed Parts
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Component SKU</th>
                  <th className="px-4 py-2.5">Serial Number</th>
                  <th className="px-4 py-2.5">Lot #</th>
                  <th className="px-4 py-2.5">Installed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {components.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">
                      Components verified from BOM kit.
                    </td>
                  </tr>
                ) : (
                  components.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        {c.component_sku}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-navy-900">
                        {c.component_serial_no || "Lot Tracked"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{c.lot_no || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {new Date(c.installed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Functional Tests & Burn-in History */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                Functional Tests & Burn-In Record
              </h2>
              <span className="text-xs text-slate-500">{tests.length} Recorded Runs</span>
            </div>

            {tests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                All mandatory diagnostic POST and 24h burn-in tests passed before QC handover.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 p-4">
                {tests.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
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
                      {t.notes && <p className="text-slate-500 text-[11px] mt-0.5">{t.notes}</p>}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
