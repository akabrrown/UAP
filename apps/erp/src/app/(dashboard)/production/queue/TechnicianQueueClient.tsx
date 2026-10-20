"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  PlusCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { claimNextUnit } from "../actions";

interface AssignedUnit {
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
}

export function TechnicianQueueClient({
  assignedUnits,
  unassignedAvailableCount,
  technicianName,
}: {
  assignedUnits: AssignedUnit[];
  unassignedAvailableCount: number;
  technicianName: string;
}) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const handleClaimNext = async () => {
    setIsClaiming(true);
    setClaimMessage(null);
    const res = await claimNextUnit();
    if (res.success && res.unitId) {
      router.push(`/production/units/${res.unitId}`);
    } else {
      setClaimMessage(res.message || "No released units waiting to be claimed.");
      setIsClaiming(false);
    }
  };

  const buildingUnits = assignedUnits.filter((u) => u.status === "building");
  const testingUnits = assignedUnits.filter((u) => u.status === "testing");
  const reworkUnits = assignedUnits.filter((u) => u.status === "rework");
  const qcUnits = assignedUnits.filter((u) => u.status === "qc_hold");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Technician Production Queue</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              Bench Workspace &middot; Section 08
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, <span className="font-semibold text-slate-700">{technicianName}</span>. Your active assembly bench queue and testing assignments.
          </p>
        </div>

        <button
          onClick={handleClaimNext}
          disabled={isClaiming || unassignedAvailableCount === 0}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded text-white shadow-sm transition-all ${
            isClaiming || unassignedAvailableCount === 0
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-navy-800 hover:bg-navy-900"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Claim Next Unit ({unassignedAvailableCount} Waiting)</span>
        </button>
      </div>

      {claimMessage && (
        <div className="p-4 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs">
          {claimMessage}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Currently Building</span>
          <p className="text-2xl font-bold text-navy-900 mt-1">{buildingUnits.length}</p>
          <span className="text-[11px] text-slate-400">Bench assembly & parts integration</span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">In Functional Testing</span>
          <p className="text-2xl font-bold text-purple-700 mt-1">{testingUnits.length}</p>
          <span className="text-[11px] text-slate-400">POST, burn-in & OS imaging</span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Rework Assigned</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{reworkUnits.length}</p>
          <span className="text-[11px] text-slate-400">QC defects to rectify</span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Submitted for QC</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{qcUnits.length}</p>
          <span className="text-[11px] text-slate-400">Awaiting independent inspector</span>
        </div>
      </div>

      {/* Active Work Units */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">My Active Units on Bench ({assignedUnits.length})</h2>

        {assignedUnits.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-3">
            <Cpu className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-sm font-semibold text-slate-600">Your bench queue is empty</p>
            <p>Click &quot;Claim Next Unit&quot; above to fetch the next released build kit.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedUnits.map((u) => (
              <div
                key={u.id}
                className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-navy-800 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-base text-navy-900">
                      {u.internal_ref}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.status === "rework"
                          ? "bg-rose-100 text-rose-800"
                          : u.status === "qc_hold"
                          ? "bg-amber-100 text-amber-800"
                          : u.status === "testing"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {u.status}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800">{u.model_sku}</p>
                  <p className="text-[11px] text-slate-500 truncate">{u.model_name}</p>

                  <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Order Reference:</span>
                      <span className="font-mono text-slate-700">{u.assembly_order_no || "Stock"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Assigned:</span>
                      <span className="text-slate-700">{new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/production/units/${u.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white transition-colors"
                >
                  <span>Open Bench Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
