"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ship,
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Anchor,
  FileText,
  DollarSign,
  Layers,
  History,
  PlusCircle,
  Truck,
  ShieldAlert,
  ArrowRight,
  Plane,
} from "lucide-react";
import {
  updateShipmentStatus,
  addShipmentCharge,
  markChargeActual,
} from "../actions";

interface ShipmentDetailProps {
  shipment: {
    id: string;
    shipment_no: string;
    mode: string;
    status: string;
    incoterm?: string;
    bl_awb_no?: string;
    container_nos: string[];
    vessel_or_flight?: string;
    port_of_loading?: string;
    port_of_discharge?: string;
    etd?: string;
    eta: string;
    original_eta?: string;
    ata?: string;
    free_days?: number;
    free_days_start?: string;
    currency: string;
    notes?: string;
    created_at: string;
    supplier_name: string;
    supplier_country?: string;
    slippageDays: number;
    freeDaysLeft: number | null;
  };
  lines: Array<{
    id: string;
    item_id: string;
    qty_shipped: string | number;
    unit_value_minor: string | number;
    currency: string;
    weight_kg?: string | number;
    volume_cbm?: string | number;
    sku: string;
    item_name: string;
    hs_code?: string;
    po_no?: string;
  }>;
  customsEntry: {
    id: string;
    entry_no: string;
    regime?: string;
    status: string;
    customs_value_minor?: string | number;
    duty_minor?: string | number;
    vat_minor?: string | number;
    levies_minor?: string | number;
    total_payable_minor?: string | number;
    currency: string;
    inspection_lane?: string;
    lodged_on?: string;
    assessed_on?: string;
    paid_on?: string;
    released_on?: string;
    notes?: string;
  } | null;
  charges: Array<{
    id: string;
    charge_type: string;
    description?: string;
    amount_minor: string | number;
    currency: string;
    fx_rate: string | number;
    amount_base_minor: string | number;
    allocation_basis: string;
    is_recoverable: boolean;
    status: string;
    invoice_ref?: string;
    incurred_on?: string;
  }>;
  events: Array<{
    id: string;
    event_type: string;
    location?: string;
    occurred_at: string;
    source: string;
    note?: string;
  }>;
  auditEntries: Array<{
    id: string;
    action: string;
    created_at: string;
    actor_name: string;
    new_data: any;
  }>;
  userScopes: string[];
}

export function ShipmentDetailClient({
  shipment,
  lines,
  customsEntry,
  charges,
  events,
  auditEntries,
  userScopes,
}: ShipmentDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"lines" | "customs" | "charges" | "timeline">("lines");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showActualModal, setShowActualModal] = useState(false);
  const [selectedChargeId, setSelectedChargeId] = useState<string | null>(null);

  // New Charge Form
  const [chargeType, setChargeType] = useState("freight");
  const [chargeDesc, setChargeDesc] = useState("");
  const [chargeAmount, setChargeAmount] = useState<number>(0);
  const [chargeCurrency, setChargeCurrency] = useState("USD");
  const [chargeFxRate, setChargeFxRate] = useState<number>(15.5);
  const [chargeBasis, setChargeBasis] = useState("value");
  const [chargeRecoverable, setChargeRecoverable] = useState(false);

  // Actual Charge Form
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [invoiceRef, setInvoiceRef] = useState("");

  const canEdit = userScopes.includes("imports.write") || userScopes.includes("admin.all");

  const stages = [
    { key: "booked", label: "Booked" },
    { key: "in_transit", label: "In Transit" },
    { key: "arrived", label: "Arrived" },
    { key: "customs_processing", label: "Customs" },
    { key: "cleared", label: "Cleared" },
    { key: "delivered", label: "Delivered" },
  ];

  const currentStageIndex = stages.findIndex((s) => s.key === shipment.status);

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    setIsProcessing(true);
    setActionError(null);
    const res = await updateShipmentStatus({
      shipmentId: shipment.id,
      newStatus,
      reason,
      location: shipment.port_of_discharge || "Tema Port",
    });

    if (res.success) {
      router.refresh();
    } else {
      setActionError(res.error || "Failed to update shipment status.");
    }
    setIsProcessing(false);
    setShowHoldModal(false);
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chargeAmount <= 0) return;

    setIsProcessing(true);
    const res = await addShipmentCharge({
      shipmentId: shipment.id,
      chargeType,
      description: chargeDesc,
      amountMinor: Math.round(chargeAmount * 100),
      currency: chargeCurrency,
      fxRate: chargeFxRate,
      allocationBasis: chargeBasis,
      isRecoverable: chargeRecoverable,
    });

    if (res.success) {
      setShowChargeModal(false);
      setChargeDesc("");
      setChargeAmount(0);
      router.refresh();
    } else {
      setActionError(res.error || "Failed to add charge.");
    }
    setIsProcessing(false);
  };

  const handleMarkActual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChargeId || actualAmount <= 0) return;

    setIsProcessing(true);
    const res = await markChargeActual({
      chargeId: selectedChargeId,
      shipmentId: shipment.id,
      actualMinor: Math.round(actualAmount * 100),
      invoiceRef,
    });

    if (res.success) {
      setShowActualModal(false);
      setSelectedChargeId(null);
      setActualAmount(0);
      setInvoiceRef("");
      router.refresh();
    } else {
      setActionError(res.error || "Failed to mark charge actual.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/imports/shipments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shipments</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-ink">{shipment.shipment_no}</h1>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                shipment.status === "held"
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : shipment.status === "delivered"
                  ? "bg-teal-100 text-teal-800 border-teal-300"
                  : shipment.status === "cleared"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {shipment.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supplier: <span className="font-semibold text-slate-700">{shipment.supplier_name}</span> &middot; Mode:{" "}
            <span className="uppercase font-semibold text-slate-700">{shipment.mode}</span> &middot; Incoterm:{" "}
            <span className="font-semibold text-slate-700">{shipment.incoterm || "FOB"}</span>
          </p>
        </div>

        {/* Action Button Workflow (Sections 06 & 17) */}
        <div className="flex flex-wrap items-center gap-2">
          {shipment.status === "booked" && (
            <button
              onClick={() => handleStatusChange("in_transit")}
              disabled={isProcessing || !canEdit}
              className="px-3.5 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white shadow-sm transition-all"
            >
              Mark Departed &rarr;
            </button>
          )}

          {shipment.status === "in_transit" && (
            <button
              onClick={() => handleStatusChange("arrived")}
              disabled={isProcessing || !canEdit}
              className="px-3.5 py-2 text-xs font-semibold rounded bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm transition-all"
            >
              Mark Arrived (Start Clock) &rarr;
            </button>
          )}

          {shipment.status === "arrived" && (
            <button
              onClick={() => handleStatusChange("customs_processing")}
              disabled={isProcessing || !canEdit}
              className="px-3.5 py-2 text-xs font-semibold rounded bg-purple-700 hover:bg-purple-800 text-white shadow-sm transition-all"
            >
              Start Customs Entry &rarr;
            </button>
          )}

          {shipment.status === "customs_processing" && (
            <>
              <button
                onClick={() => setShowHoldModal(true)}
                disabled={isProcessing || !canEdit}
                className="px-3.5 py-2 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
              >
                Mark Held
              </button>
              <button
                onClick={() => handleStatusChange("cleared")}
                disabled={isProcessing || !canEdit}
                className="px-3.5 py-2 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all"
              >
                Mark Cleared &rarr;
              </button>
            </>
          )}

          {shipment.status === "held" && (
            <button
              onClick={() => handleStatusChange("customs_processing", "Hold resolved by clearance agent")}
              disabled={isProcessing || !canEdit}
              className="px-3.5 py-2 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all"
            >
              Release Hold &rarr;
            </button>
          )}

          {shipment.status === "cleared" && (
            <button
              onClick={() => handleStatusChange("delivered")}
              disabled={isProcessing || !canEdit}
              className="px-3.5 py-2 text-xs font-semibold rounded bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition-all"
            >
              Mark Delivered (Create GRN) &rarr;
            </button>
          )}

          {shipment.status === "delivered" && (
            <Link
              href={`/imports/landed-cost/new?shipment=${shipment.id}`}
              className="px-3.5 py-2 text-xs font-semibold rounded bg-gold-600 hover:bg-gold-700 text-white shadow-sm transition-all flex items-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Run Landed Cost</span>
            </Link>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Progress Stage Tracker (Section 06 Spec) */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3 font-medium">
          <span className="flex items-center gap-1.5 text-navy-900 font-semibold">
            <Anchor className="w-4 h-4 text-navy-800" />
            IMPORT PIPELINE STAGE
          </span>
          <div className="flex items-center gap-4">
            {shipment.slippageDays > 0 && (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Slippage: +{shipment.slippageDays} days
              </span>
            )}
            {shipment.freeDaysLeft !== null && (
              <span
                className={`font-semibold ${
                  shipment.freeDaysLeft <= 3 ? "text-red-600" : "text-emerald-700"
                }`}
              >
                Port Free Days: {shipment.freeDaysLeft} remaining
              </span>
            )}
          </div>
        </div>

        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-0" />
          {stages.map((stage, idx) => {
            const isCompleted = currentStageIndex > idx || shipment.status === "delivered";
            const isCurrent = shipment.status === stage.key;
            return (
              <div key={stage.key} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-navy-800 text-white ring-4 ring-navy-100"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isCompleted && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] mt-1.5 font-medium ${
                    isCurrent ? "text-navy-900 font-bold" : "text-slate-500"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("lines")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "lines"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Shipment Lines ({lines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("customs")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "customs"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Customs Entry ({customsEntry ? customsEntry.status : "None"})</span>
        </button>

        <button
          onClick={() => setActiveTab("charges")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "charges"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Landed Charges ({charges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "timeline"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Timeline & Milestones ({events.length})</span>
        </button>
      </div>

      {/* Tab 1: Shipment Lines */}
      {activeTab === "lines" && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">PO Reference</th>
                <th className="px-4 py-3">SKU & Component</th>
                <th className="px-4 py-3">HS Code</th>
                <th className="px-4 py-3 text-right">Shipped Qty</th>
                <th className="px-4 py-3 text-right">Unit Value</th>
                <th className="px-4 py-3 text-right">Total Goods Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono font-semibold text-navy-900">
                    {l.po_no || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{l.sku}</span>
                    <span className="block text-slate-500 text-[11px] truncate max-w-sm">
                      {l.item_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">{l.hs_code || "8471.30.00"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {Number(l.qty_shipped).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {l.currency} {(Number(l.unit_value_minor) / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-900">
                    {l.currency}{" "}
                    {((Number(l.unit_value_minor) * Number(l.qty_shipped)) / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Customs Entry */}
      {activeTab === "customs" && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          {customsEntry ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    Declaration #{customsEntry.entry_no}
                  </h3>
                  <span className="text-xs text-slate-500">
                    ICUMS Regime: {customsEntry.regime || "Home Consumption (IM4)"} &middot; Lane:{" "}
                    <span className="font-semibold uppercase text-slate-700">
                      {customsEntry.inspection_lane || "Yellow"}
                    </span>
                  </span>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                  {customsEntry.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Customs CIF Value:</span>
                  <span className="text-sm font-semibold text-slate-800">
                    GHS {(Number(customsEntry.customs_value_minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Import Duty:</span>
                  <span className="text-sm font-semibold text-slate-800">
                    GHS {(Number(customsEntry.duty_minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Import VAT & Levies:</span>
                  <span className="text-sm font-semibold text-slate-800">
                    GHS {((Number(customsEntry.vat_minor || 0) + Number(customsEntry.levies_minor || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Payable:</span>
                  <span className="text-sm font-bold text-navy-900">
                    GHS {(Number(customsEntry.total_payable_minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
                <span>Lodged: {customsEntry.lodged_on || "—"}</span>
                <span>Assessed: {customsEntry.assessed_on || "—"}</span>
                <span>Paid: {customsEntry.paid_on || "—"}</span>
                <span>Released: {customsEntry.released_on || "—"}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <FileText className="w-8 h-8 mx-auto opacity-40" />
              <p>No customs declaration lodged yet.</p>
              {shipment.status === "arrived" && canEdit && (
                <button
                  onClick={() => handleStatusChange("customs_processing")}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-navy-800 text-white hover:bg-navy-900"
                >
                  Start Customs Declaration
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Landed Charges */}
      {activeTab === "charges" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Estimated and actual costs for landed-cost allocation.
            </span>
            {canEdit && (
              <button
                onClick={() => setShowChargeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-navy-800 text-white hover:bg-navy-900 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Charge</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Charge Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Basis</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Base Amount (GHS)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No freight, customs or handling charges recorded yet.
                    </td>
                  </tr>
                ) : (
                  charges.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-800 uppercase text-[11px]">
                        {c.charge_type.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.description || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 capitalize">{c.allocation_basis}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {c.currency} {(Number(c.amount_minor) / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-navy-900">
                        GHS {(Number(c.amount_base_minor) / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.status === "actual"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === "estimated" && canEdit && (
                          <button
                            onClick={() => {
                              setSelectedChargeId(c.id);
                              setActualAmount(Number(c.amount_minor) / 100);
                              setShowActualModal(true);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold rounded text-navy-800 hover:bg-navy-50"
                          >
                            Mark Actual
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Timeline */}
      {activeTab === "timeline" && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-ink">Shipment Milestone Events</h3>
          <div className="border-l-2 border-slate-200 ml-3 space-y-6 pl-4">
            {events.map((ev) => (
              <div key={ev.id} className="relative">
                <div className="absolute -left-[23px] top-0 w-3.5 h-3.5 rounded-full bg-navy-800 ring-4 ring-white" />
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-ink uppercase tracking-wider">
                    {ev.event_type.replace("_", " ")}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(ev.occurred_at).toLocaleString()}
                  </span>
                </div>
                {ev.location && <span className="text-xs text-slate-500 block">Location: {ev.location}</span>}
                {ev.note && <p className="text-xs text-slate-600 mt-1">{ev.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hold Reason Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Put Shipment on Customs Hold
            </h3>
            <p className="text-xs text-slate-500">
              Section 06 Workflow: A hold reason is mandatory to notify Management and Inventory.
            </p>
            <textarea
              rows={3}
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="e.g. Valuation discrepancy on HS code 8471; query issued by Customs officer."
              className="w-full text-xs px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
              required
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowHoldModal(false)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange("held", holdReason)}
                disabled={!holdReason.trim() || isProcessing}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-rose-600 text-white hover:bg-rose-700 disabled:bg-slate-300"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink">Add Shipment Cost / Charge</h3>
            <form onSubmit={handleAddCharge} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Charge Type</label>
                <select
                  value={chargeType}
                  onChange={(e) => setChargeType(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                >
                  <option value="freight">Ocean / Air Freight</option>
                  <option value="customs_duty">Customs Duty & Levies</option>
                  <option value="port_handling">Port Terminal Handling (GPHA/MPS)</option>
                  <option value="insurance">Transit Marine Insurance</option>
                  <option value="clearing_fee">Clearing Agency Fee</option>
                  <option value="demurrage">Port Demurrage / Storage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Maersk Ocean B/L Freight"
                  value={chargeDesc}
                  onChange={(e) => setChargeDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
                  <select
                    value={chargeCurrency}
                    onChange={(e) => setChargeCurrency(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                  >
                    <option value="USD">USD</option>
                    <option value="GHS">GHS</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Allocation Basis</label>
                <select
                  value={chargeBasis}
                  onChange={(e) => setChargeBasis(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                >
                  <option value="value">By Value (Standard for duty/insurance)</option>
                  <option value="weight">By Weight (Standard for air freight)</option>
                  <option value="volume">By Volume (Standard for ocean freight)</option>
                  <option value="quantity">By Unit Quantity</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowChargeModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || chargeAmount <= 0}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-navy-800 text-white hover:bg-navy-900 disabled:bg-slate-300"
                >
                  Save Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Actual Modal */}
      {showActualModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink">Actual Invoiced Charge</h3>
            <p className="text-xs text-slate-500">
              Replace the estimated estimate with the actual invoiced figure prior to landed-cost allocation.
            </p>
            <form onSubmit={handleMarkActual} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Invoiced Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Vendor Invoice Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-908"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border border-slate-300"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowActualModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || actualAmount <= 0}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-navy-800 text-white hover:bg-navy-900 disabled:bg-slate-300"
                >
                  Save Actual Figure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
