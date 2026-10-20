"use client";

import { useState } from "react";
import {
  Barcode,
  Printer,
  Sliders,
  CheckCircle2,
  Box,
  Layers,
  Building2,
} from "lucide-react";

interface Item {
  id: string;
  sku: string;
  name: string;
}

interface Unit {
  id: string;
  serial_no: string;
  build_ref: string;
  model_sku: string;
}

interface Location {
  id: string;
  code: string;
  name: string;
}

export function LabelsClient({
  items,
  units,
  locations,
}: {
  items: Item[];
  units: Unit[];
  locations: Location[];
}) {
  const [targetType, setTargetType] = useState<"item" | "unit" | "bin">("unit");
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || "");
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || "");
  const [selectedLocId, setSelectedLocId] = useState(locations[0]?.id || "");
  const [labelSize, setLabelSize] = useState<"50x30" | "25x15">("50x30");
  const [copies, setCopies] = useState<number>(1);

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const selectedUnit = units.find((u) => u.id === selectedUnitId);
  const selectedLoc = locations.find((l) => l.id === selectedLocId);

  const getLabelContent = () => {
    if (targetType === "unit" && selectedUnit) {
      return {
        title: "UPSA COMPUTER ASSEMBLY UNIT",
        code: selectedUnit.serial_no,
        subtitle: `${selectedUnit.model_sku} (Ref: ${selectedUnit.build_ref})`,
        spec: "Accra, Ghana &bull; Model Ref",
      };
    }
    if (targetType === "item" && selectedItem) {
      return {
        title: "UPSA INVENTORY SKU",
        code: selectedItem.sku,
        subtitle: selectedItem.name,
        spec: "Central Inventory Store",
      };
    }
    if (targetType === "bin" && selectedLoc) {
      return {
        title: "WAREHOUSE BIN LOCATION",
        code: selectedLoc.code,
        subtitle: selectedLoc.name,
        spec: "Location Bin Address",
      };
    }
    return {
      title: "UPSA ASSEMBLY UNIT",
      code: "UPSA-SAMPLE-0001",
      subtitle: "Component Specimen",
      spec: "Inventory Tag",
    };
  };

  const content = getLabelContent();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">Barcode & Label Generator</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-navy-50 text-navy-800 border border-navy-100">
              Section 07 Labels
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Thermal label generator for item cartons, finished computer serials, and warehouse shelf bin locations.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-navy-800 hover:bg-navy-900 text-white shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print Thermal Label ({copies} Copies)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Sliders className="w-4 h-4 text-navy-800" />
            Label Format & Target Selection
          </h2>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Label Category</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType("unit")}
                className={`py-2 px-2 text-xs font-semibold rounded-md border text-center transition-all ${
                  targetType === "unit"
                    ? "bg-navy-50 border-navy-800 text-navy-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Finished Unit
              </button>
              <button
                type="button"
                onClick={() => setTargetType("item")}
                className={`py-2 px-2 text-xs font-semibold rounded-md border text-center transition-all ${
                  targetType === "item"
                    ? "bg-navy-50 border-navy-800 text-navy-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Catalog SKU
              </button>
              <button
                type="button"
                onClick={() => setTargetType("bin")}
                className={`py-2 px-2 text-xs font-semibold rounded-md border text-center transition-all ${
                  targetType === "bin"
                    ? "bg-navy-50 border-navy-800 text-navy-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Shelf / Bin
              </button>
            </div>
          </div>

          {/* Target Entity Picker */}
          {targetType === "unit" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Finished Computer Unit
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300 font-mono"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.serial_no} — {u.model_sku} (Build {u.build_ref})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === "item" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Catalog Component / Item
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300"
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.sku} — {i.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === "bin" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Select Warehouse Bin Location
              </label>
              <select
                value={selectedLocId}
                onChange={(e) => setSelectedLocId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-slate-300"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Size Format */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Standard Physical Dimension
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLabelSize("50x30")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  labelSize === "50x30"
                    ? "border-navy-800 bg-navy-50/50 text-navy-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="font-semibold text-xs block">50 &times; 30 mm</span>
                <span className="text-[11px] text-slate-500">Standard Computer & Carton Tag</span>
              </button>

              <button
                type="button"
                onClick={() => setLabelSize("25x15")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  labelSize === "25x15"
                    ? "border-navy-800 bg-navy-50/50 text-navy-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="font-semibold text-xs block">25 &times; 15 mm</span>
                <span className="text-[11px] text-slate-500">Compact Micro Component Tag</span>
              </button>
            </div>
          </div>

          {/* Number of Copies */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Quantity to Print
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="w-24 text-xs px-3 py-2 rounded border border-slate-300"
            />
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-7 bg-slate-100 p-8 rounded-lg border border-slate-200 flex flex-col items-center justify-center space-y-4">
          <div className="text-xs text-slate-500 font-medium">
            Live Preview (Rendered at exact {labelSize === "50x30" ? "50mm × 30mm" : "25mm × 15mm"} scale)
          </div>

          {/* Actual Label Preview Card */}
          <div
            id="print-label-area"
            className={`bg-white border-2 border-black rounded p-3 flex flex-col justify-between shadow-md transition-all ${
              labelSize === "50x30" ? "w-[340px] h-[210px]" : "w-[240px] h-[140px]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black pb-1">
              <span className="font-bold text-[10px] tracking-tight uppercase text-black">
                {content.title}
              </span>
              <span className="text-[8px] font-mono font-bold text-black">UAP-GH</span>
            </div>

            {/* Simulated High-Res Barcode Pattern */}
            <div className="my-2 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-0.5 h-10 w-full overflow-hidden px-2">
                {[...Array(38)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-full bg-black ${
                      i % 7 === 0 ? "w-1" : i % 3 === 0 ? "w-0.5" : i % 5 === 0 ? "w-1.5" : "w-[1px]"
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono font-bold text-xs tracking-widest mt-1 text-black">
                {content.code}
              </span>
            </div>

            {/* Footer Metadata */}
            <div className="border-t border-black pt-1 flex items-center justify-between text-[9px] text-black">
              <span className="font-semibold truncate max-w-[180px]">{content.subtitle}</span>
              <span className="font-mono text-[8px]">UPSA-ACCRA</span>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-400 max-w-sm">
            Ready for Zebra ZD series, Dymo LabelWriter, and standard ESC/POS thermal printers.
          </div>
        </div>
      </div>
    </div>
  );
}
