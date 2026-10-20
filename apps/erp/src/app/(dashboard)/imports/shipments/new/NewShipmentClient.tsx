"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ship,
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Anchor,
  Plane,
  Truck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { createShipment } from "../actions";

interface Supplier {
  id: string;
  name: string;
  currency: string;
  country: string;
}

interface POLine {
  po_id: string;
  po_no: string;
  supplier_id: string;
  po_line_id: string;
  item_id: string;
  sku: string;
  item_name: string;
  ordered_qty: string | number;
  unit_price_minor: string | number;
  currency: string;
}

interface CatalogItem {
  id: string;
  sku: string;
  name: string;
}

interface SelectedLine {
  poLineId?: string;
  poNo?: string;
  itemId: string;
  sku: string;
  itemName: string;
  qtyShipped: number;
  unitValueMinor: number;
  currency: string;
  weightKg?: number;
  volumeCbm?: number;
}

export function NewShipmentClient({
  suppliers,
  poLines,
  catalogItems,
}: {
  suppliers: Supplier[];
  poLines: POLine[];
  catalogItems: CatalogItem[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || "");
  const [mode, setMode] = useState<string>("sea");
  const [incoterm, setIncoterm] = useState<string>("FOB");
  const [blAwbNo, setBlAwbNo] = useState<string>("");
  const [containerInput, setContainerInput] = useState<string>("");
  const [vesselOrFlight, setVesselOrFlight] = useState<string>("");
  const [portOfLoading, setPortOfLoading] = useState<string>("");
  const [portOfDischarge, setPortOfDischarge] = useState<string>("Tema Port (GH)");
  const [etd, setEtd] = useState<string>("");
  const [eta, setEta] = useState<string>("");
  const [freeDays, setFreeDays] = useState<number>(14);
  const [currency, setCurrency] = useState<string>("USD");
  const [notes, setNotes] = useState<string>("");

  const [lines, setLines] = useState<SelectedLine[]>([]);

  // Filter available PO lines for the selected supplier
  const availablePOLines = poLines.filter((pl) => pl.supplier_id === supplierId);

  const handleAddPOLine = (line: POLine) => {
    // Check if already added
    if (lines.some((l) => l.poLineId === line.po_line_id)) return;

    setLines([
      ...lines,
      {
        poLineId: line.po_line_id,
        poNo: line.po_no,
        itemId: line.item_id,
        sku: line.sku,
        itemName: line.item_name,
        qtyShipped: Number(line.ordered_qty),
        unitValueMinor: Number(line.unit_price_minor),
        currency: line.currency,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleUpdateLineQty = (idx: number, qty: number) => {
    const updated = [...lines];
    updated[idx].qtyShipped = Math.max(1, qty);
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eta) {
      setErrorMessage("Expected Arrival Date (ETA) is required.");
      return;
    }
    if (lines.length === 0) {
      setErrorMessage("Please select at least one item line to ship.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const containerNos = containerInput
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const res = await createShipment({
      supplierId,
      mode,
      incoterm,
      blAwbNo: blAwbNo || undefined,
      containerNos: containerNos.length > 0 ? containerNos : undefined,
      vesselOrFlight: vesselOrFlight || undefined,
      portOfLoading: portOfLoading || undefined,
      portOfDischarge: portOfDischarge || undefined,
      etd: etd || undefined,
      eta,
      freeDays,
      currency,
      notes: notes || undefined,
      lines: lines.map((l) => ({
        poLineId: l.poLineId,
        itemId: l.itemId,
        qtyShipped: l.qtyShipped,
        unitValueMinor: l.unitValueMinor,
        currency: l.currency,
        weightKg: l.weightKg,
        volumeCbm: l.volumeCbm,
      })),
    });

    if (res.success && res.shipmentId) {
      router.push(`/imports/shipments/${res.shipmentId}`);
    } else {
      setErrorMessage(res.error || "Failed to create shipment.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/imports/shipments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Shipments</span>
        </Link>
        <span className="text-xs text-slate-400">Section 06 Workflow &middot; Imports</span>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-navy-800" />
            <h1 className="text-lg font-semibold text-ink">Book New Import Shipment</h1>
          </div>
          <span className="text-xs text-slate-500 font-medium">Initial Status: Booked</span>
        </div>

        {errorMessage && (
          <div className="m-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Supplier & Freight Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setLines([]);
                }}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.country} - {s.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Transport Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
              >
                <option value="sea">Sea Freight</option>
                <option value="air">Air Cargo</option>
                <option value="road">Road / Overland</option>
                <option value="courier">Courier Express (DHL/FedEx)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Incoterm</label>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
              >
                <option value="FOB">FOB (Free on Board)</option>
                <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                <option value="CFR">CFR (Cost & Freight)</option>
                <option value="EXW">EXW (Ex Works)</option>
                <option value="DDP">DDP (Delivered Duty Paid)</option>
              </select>
            </div>
          </div>

          {/* Logistics Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                BL / AWB Number
              </label>
              <input
                type="text"
                placeholder="e.g. MSKU9876543"
                value={blAwbNo}
                onChange={(e) => setBlAwbNo(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Vessel / Flight Name
              </label>
              <input
                type="text"
                placeholder="e.g. MSC Luciana / AF682"
                value={vesselOrFlight}
                onChange={(e) => setVesselOrFlight(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Port of Loading
              </label>
              <input
                type="text"
                placeholder="e.g. Shanghai / Shenzhen"
                value={portOfLoading}
                onChange={(e) => setPortOfLoading(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Port of Discharge
              </label>
              <input
                type="text"
                value={portOfDischarge}
                onChange={(e) => setPortOfDischarge(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>
          </div>

          {/* Schedule & Port Free Days */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Estimated Departure (ETD)
              </label>
              <input
                type="date"
                value={etd}
                onChange={(e) => setEtd(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Estimated Arrival (ETA) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Demurrage Free Days
              </label>
              <input
                type="number"
                min={0}
                value={freeDays}
                onChange={(e) => setFreeDays(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Container Numbers (comma-sep)
              </label>
              <input
                type="text"
                placeholder="e.g. MSKU1234567, TGHU7654321"
                value={containerInput}
                onChange={(e) => setContainerInput(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-navy-800"
              />
            </div>
          </div>

          {/* Open Purchase Order Lines Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                Purchase Order Lines for {suppliers.find((s) => s.id === supplierId)?.name}
              </h2>
              <span className="text-xs text-slate-500">
                {availablePOLines.length} available lines
              </span>
            </div>

            {availablePOLines.length > 0 ? (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                {availablePOLines.map((line) => {
                  const isAdded = lines.some((l) => l.poLineId === line.po_line_id);
                  return (
                    <div
                      key={line.po_line_id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-navy-900">{line.po_no}</span>
                          <span className="font-semibold text-slate-700">{line.sku}</span>
                          <span className="text-slate-500 truncate max-w-xs">{line.item_name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          Order Qty: {line.ordered_qty} &middot; Unit Price: {line.currency}{" "}
                          {(Number(line.unit_price_minor) / 100).toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddPOLine(line)}
                        disabled={isAdded}
                        className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                          isAdded
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-navy-800 text-white hover:bg-navy-900"
                        }`}
                      >
                        {isAdded ? "Added" : "+ Add Line"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                No open confirmed PO lines found for this supplier. You can pick general catalog items below.
              </div>
            )}
          </div>

          {/* Selected Shipment Lines */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-ink">Selected Lines in this Shipment</h2>
            {lines.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs">
                No lines selected yet. Click &quot;+ Add Line&quot; from the PO list above to add items to this shipment.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">PO #</th>
                      <th className="px-4 py-2.5">SKU & Item</th>
                      <th className="px-4 py-2.5 w-32">Qty Shipped</th>
                      <th className="px-4 py-2.5">Unit Value</th>
                      <th className="px-4 py-2.5">Total Value</th>
                      <th className="px-4 py-2.5 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono text-navy-800 font-semibold">
                          {line.poNo || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800">{line.sku}</span>
                          <span className="block text-slate-500 text-[11px] truncate max-w-xs">
                            {line.itemName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            value={line.qtyShipped}
                            onChange={(e) => handleUpdateLineQty(idx, Number(e.target.value))}
                            className="w-20 px-2 py-1 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {line.currency} {(line.unitValueMinor / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-navy-900">
                          {line.currency} {((line.unitValueMinor * line.qtyShipped) / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Internal Dispatch / Forwarder Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Forwarder contact: Kofi at Baj Freight; Container seal intact."
              className="w-full text-xs px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href="/imports/shipments"
              className="px-4 py-2 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || lines.length === 0}
              className={`px-5 py-2 text-xs font-semibold rounded text-white shadow-sm transition-all ${
                isSubmitting || lines.length === 0
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-navy-800 hover:bg-navy-900"
              }`}
            >
              {isSubmitting ? "Creating Shipment..." : "Create & Book Shipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
