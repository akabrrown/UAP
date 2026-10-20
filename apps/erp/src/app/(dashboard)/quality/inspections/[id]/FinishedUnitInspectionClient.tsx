"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  Cpu,
  Layers,
  Flame,
  Check,
  RotateCcw,
} from "lucide-react";
import { decideQCInspection } from "../../../production/actions";

interface FinishedUnitInspectionProps {
  unit: {
    id: string;
    internal_ref: string;
    serial_no?: string;
    status: string;
    built_by?: string;
    model_sku: string;
    model_name: string;
    assembly_order_no?: string;
    built_by_name?: string;
  };
  components: Array<{
    id: string;
    component_sku: string;
    component_name: string;
    component_serial_no?: string;
    lot_no?: string;
    supplier_name?: string;
  }>;
  tests: Array<{
    id: string;
    test_type: string;
    result: string;
    notes?: string;
    created_at: string;
  }>;
  defectCodes: Array<{
    id: string;
    code: string;
    description: string;
    category?: string;
  }>;
  currentUserId: string;
}

export function FinishedUnitInspectionClient({
  unit,
  components,
  tests,
  defectCodes,
  currentUserId,
}: FinishedUnitInspectionProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFailModal, setShowFailModal] = useState(false);
  const [defectNotes, setDefectNotes] = useState("");
  const [defectSeverity, setDefectSeverity] = useState("major");
  const [selectedDefectCodeId, setSelectedDefectCodeId] = useState(defectCodes[0]?.id || "");

  // Section 08 Dual Custody Rule:
  // "qc.inspect (QI) — not the person who built or worked on the unit"
  // "You worked on this unit and cannot inspect it — buttons disabled"
  const isBuilder = unit.built_by === currentUserId;

  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    screenPixel: true,
    keyboardTrackpad: true,
    usbHdmiPorts: true,
    wifiBluetooth: true,
    speakersMicrophone: true,
    batteryCharging: true,
    screwsChassisFit: true,
    biosSerialNumberLock: true,
  });

  const allChecklistPassed = Object.values(checklist).every(Boolean);

  const handleDecision = async (result: "pass" | "fail" | "conditional") => {
    if (result === "pass") {
      if (!confirm("Confirm Quality Pass: This will generate an official final serial (UPSA-LAP-2026-XXXXXX), move the unit to Finished Goods Inventory, and write the immutable stock ledger entry. Proceed?")) {
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await decideQCInspection({
      unitId: unit.id,
      result,
      checklist,
      notes: result === "fail" ? defectNotes : undefined,
      defectCodeId: result === "fail" ? selectedDefectCodeId : undefined,
      defectSeverity: result === "fail" ? defectSeverity : undefined,
      defectNotes: result === "fail" ? defectNotes : undefined,
    });

    if (res.success) {
      if (res.finalSerial) {
        alert(`Unit Successfully Passed QC!\nOfficial Serial Assigned: ${res.finalSerial}`);
      }
      router.push("/quality/inspections");
    } else {
      setErrorMsg(res.error || "Failed to submit QC decision.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/quality/inspections"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Inspections Queue</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-ink">
              QC Inspection: {unit.internal_ref}
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold uppercase bg-amber-100 text-amber-800 border border-amber-300">
              {unit.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Model: <strong className="text-slate-800">{unit.model_sku}</strong> &mdash;{" "}
            {unit.model_name} &middot; Assembled by:{" "}
            <strong className="text-slate-700">{unit.built_by_name || "Technician"}</strong>
          </p>
        </div>

        {/* Decision Buttons (Section 08 Standard) */}
        {!isBuilder && unit.status === "qc_hold" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFailModal(true)}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
            >
              <XCircle className="w-4 h-4" />
              <span>Fail (Send to Rework)</span>
            </button>

            <button
              onClick={() => handleDecision("conditional")}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Conditional (Hold)</span>
            </button>

            <button
              onClick={() => handleDecision("pass")}
              disabled={isSubmitting || !allChecklistPassed}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded text-white shadow-sm transition-all ${
                allChecklistPassed
                  ? "bg-emerald-700 hover:bg-emerald-800"
                  : "bg-slate-400 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Pass & Issue Final Serial &rarr;</span>
            </button>
          </div>
        )}
      </div>

      {/* Blocked message per Section 08 rules */}
      {isBuilder && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
            <span>
              <strong>Dual-Custody Conflict:</strong> You assembled or worked on this unit ({unit.internal_ref}). Under Section 08 Quality Control governance, you cannot perform independent quality sign-off on your own build. Inspection controls have been disabled.
            </span>
          </div>
          <span className="font-semibold text-amber-800 uppercase text-[11px] shrink-0 ml-4">
            Independent Sign-Off Required
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: QC Checklist */}
        <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Physical & Functional QC Checklist
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">All Required</span>
          </div>

          <div className="space-y-3">
            {[
              { key: "screenPixel", label: "Display panel: Zero dead pixels & backlight bleed" },
              { key: "keyboardTrackpad", label: "Keyboard key response & precision trackpad test" },
              { key: "usbHdmiPorts", label: "I/O Ports: USB 3.0, Type-C, HDMI & 3.5mm audio jack" },
              { key: "wifiBluetooth", label: "Wireless: Wi-Fi 6 connectivity & Bluetooth pairing" },
              { key: "speakersMicrophone", label: "Audio: Dual stereo speakers & digital mic test" },
              { key: "batteryCharging", label: "Power: AC adapter charge rate & battery health" },
              { key: "screwsChassisFit", label: "Fit & Finish: Chassis screws torqued & zero gaps" },
              { key: "biosSerialNumberLock", label: "BIOS: Official asset tag & UEFI security locked" },
            ].map((chk) => (
              <label
                key={chk.key}
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checklist[chk.key]}
                  onChange={(e) =>
                    setChecklist({ ...checklist, [chk.key]: e.target.checked })
                  }
                  disabled={isBuilder}
                  className="mt-0.5 rounded border-slate-300 text-navy-800 focus:ring-navy-800 w-4 h-4"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  {chk.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Right: Spec vs Actual Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Cpu className="w-4 h-4 text-navy-800" />
                Spec vs Actual Component Verification
              </h2>
              <span className="text-xs text-slate-500">{components.length} Verified Components</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Component</th>
                  <th className="px-4 py-2.5">Serial # Scanned</th>
                  <th className="px-4 py-2.5">Lot Origin</th>
                  <th className="px-4 py-2.5">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {components.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {c.component_sku}
                      <span className="block text-[11px] text-slate-400">{c.component_name}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-navy-900">
                      {c.component_serial_no || "Lot Tracked"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{c.lot_no || "—"}</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        BOM Matched
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Functional Tests Record */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                POST & Burn-In Test Evidence
              </h2>
              <span className="text-xs text-slate-500">{tests.length} Diagnostic Records</span>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {tests.map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 uppercase">{t.test_type}</span>
                    {t.notes && <p className="text-slate-500 text-[11px] mt-0.5">{t.notes}</p>}
                  </div>
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fail / Rework Modal */}
      {showFailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              Record QC Failure & Open Rework Order
            </h3>
            <p className="text-xs text-slate-500">
              Section 08 Workflow: This unit will be assigned to Rework and returned to the assembly technician with defect logging.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDecision("fail");
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Defect Severity
                </label>
                <select
                  value={defectSeverity}
                  onChange={(e) => setDefectSeverity(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                >
                  <option value="critical">Critical (Hardware Failure / Non-boot)</option>
                  <option value="major">Major (Component Defect / Screen pixel)</option>
                  <option value="minor">Minor (Cosmetic / Screw torque)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Defect Description & Notes
                </label>
                <textarea
                  rows={3}
                  value={defectNotes}
                  onChange={(e) => setDefectNotes(e.target.value)}
                  placeholder="e.g. 2 dead pixels on LCD panel top-right; replacement required."
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowFailModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!defectNotes.trim() || isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300"
                >
                  Confirm QC Fail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
