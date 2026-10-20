"use client";

import { useActionState, useState } from "react";
import { createAssemblyOrderAction } from "./actions";
import Link from "next/link";
import { ArrowLeft, Layers, Calendar, AlertCircle } from "lucide-react";

interface Bom {
  id: string;
  item_id: string;
  item_name: string;
  sku: string;
  version: number;
}

interface Routing {
  id: string;
  name: string;
  version: number;
}

interface InternalOrder {
  id: string;
  order_no: string;
  delivery_point: string | null;
}

interface NewAssemblyOrderClientProps {
  boms: Bom[];
  routings: Routing[];
  orders: InternalOrder[];
}

export default function NewAssemblyOrderClient({
  boms,
  routings,
  orders,
}: NewAssemblyOrderClientProps) {
  const [state, formAction, isPending] = useActionState(createAssemblyOrderAction, null);
  const [purpose, setPurpose] = useState<"stock" | "internal_order">("stock");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/production"
          className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">New Assembly Order</h1>
          <p className="text-sm text-slate-500">
            Configure a production build order based on active Bill of Materials and routing.
          </p>
        </div>
      </div>

      <form
        action={formAction}
        className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-6 space-y-6">
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {state.error}
            </div>
          )}

          {/* Section 1: Item & BOM */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              1. Build Target Specification
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="bom_id"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Bill of Materials (BOM) <span className="text-red-500">*</span>
                </label>
                <select
                  id="bom_id"
                  name="bom_id"
                  required
                  className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none bg-white"
                >
                  <option value="">Select a BOM definition...</option>
                  {boms.map((b) => (
                    <option key={b.id} value={`${b.id}|${b.item_id}`}>
                      {b.item_name} ({b.sku}) — Version {b.version}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="routing_id"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Manufacturing Routing Sequence
                </label>
                <select
                  id="routing_id"
                  name="routing_id"
                  className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none bg-white"
                >
                  <option value="">Standard Assembly Steps (Default)</option>
                  {routings.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (v{r.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="qty"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Quantity to Assemble <span className="text-red-500">*</span>
                </label>
                <input
                  id="qty"
                  name="qty"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue="50"
                  className="w-full h-9 px-3 rounded border border-slate-300 text-xs font-mono focus:border-navy-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Purpose & Priority */}
          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              2. Production Strategy & Priority
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Build Purpose <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="purpose"
                      value="stock"
                      checked={purpose === "stock"}
                      onChange={() => setPurpose("stock")}
                      className="text-navy-900 focus:ring-navy-900"
                    />
                    Build to Stock (Replenishment)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="radio"
                      name="purpose"
                      value="internal_order"
                      checked={purpose === "internal_order"}
                      onChange={() => setPurpose("internal_order")}
                      className="text-navy-900 focus:ring-navy-900"
                    />
                    Build to Order (Customer Demand)
                  </label>
                </div>
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Shop Floor Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="3"
                  className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none bg-white"
                >
                  <option value="1">Level 1 — Critical / Urgent Rush</option>
                  <option value="2">Level 2 — High Priority</option>
                  <option value="3">Level 3 — Normal Scheduled</option>
                  <option value="4">Level 4 — Low / Buffer</option>
                </select>
              </div>

              {purpose === "internal_order" && (
                <div className="sm:col-span-2 p-3 bg-slate-50 rounded border border-slate-200">
                  <label
                    htmlFor="internal_order_id"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Select Internal Sales Order
                  </label>
                  <select
                    id="internal_order_id"
                    name="internal_order_id"
                    className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none bg-white"
                  >
                    <option value="">Link to an order...</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        Order #{o.order_no} — {o.delivery_point || "Standard Distribution"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Schedule & Instructions */}
          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              3. Scheduling & Instructions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="planned_start"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Planned Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="planned_start"
                  name="planned_start"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="planned_end"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Target Completion Date
                </label>
                <input
                  id="planned_end"
                  name="planned_end"
                  type="date"
                  className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="notes"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Assembly Notes & Technician Instructions
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="w-full p-2.5 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none resize-y"
                  placeholder="Firmware revision, calibration tolerances, or specific line assignments..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <Link
            href="/production"
            className="h-9 px-4 inline-flex items-center justify-center border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold rounded transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="h-9 px-5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
          >
            {isPending ? "Generating Order..." : "Create Assembly Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
