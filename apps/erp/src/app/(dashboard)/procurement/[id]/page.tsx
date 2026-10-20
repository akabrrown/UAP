import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, Ship, FileText, Package } from "lucide-react";
import { requireAnyScope } from "@/lib/session";
import { PurchaseOrderActions } from "./PurchaseOrderActions";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyScope(["procurement.write", "procurement.approve", "inventory.receive", "reports.read"]);
  const { id } = await params;

  const poRes = await db.query(
    `select po.*, 
            s.name as supplier_name, 
            s.supplier_no, 
            s.country_code
     from proc.purchase_orders po
     join proc.suppliers s on s.id = po.supplier_id
     where po.id = $1`,
    [id]
  );

  const po = poRes.rows[0];
  if (!po) {
    notFound();
  }

  const linesRes = await db.query(
    `select pol.*, i.sku, i.name as item_name
     from proc.purchase_order_lines pol
     join catalog.items i on i.id = pol.item_id
     where pol.po_id = $1
     order by pol.line_no asc`,
    [id]
  );

  const lines = linesRes.rows;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/procurement"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </Link>
        <div className="flex items-center gap-3">
          <PurchaseOrderActions
            poId={po.id}
            poNo={po.po_no}
            status={po.status}
            shippingMode={po.shipping_mode}
            incoterm={po.incoterm}
            expectedArrivalDate={po.expected_arrival_date}
            notes={po.notes}
          />
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              po.status === "received" || po.status === "closed"
                ? "bg-pass-bg text-pass"
                : po.status === "approved" || po.status === "sent" || po.status === "confirmed"
                ? "bg-navy-50 text-navy-800"
                : po.status === "cancelled"
                ? "bg-fail-bg text-fail"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {po.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink font-mono">{po.po_no}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Issued {new Date(po.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Total Commitment</span>
            <span className="text-xl font-bold text-ink tabular-nums">
              {po.currency}{" "}
              {(Number(po.total_minor) / 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
            {po.fx_rate && po.currency !== "GHS" && (
              <span className="text-xs text-slate-400 block font-mono">
                FX Rate: {Number(po.fx_rate).toFixed(4)}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Supplier</p>
              <p className="text-sm font-semibold text-ink">{po.supplier_name}</p>
              <p className="text-xs font-mono text-slate-400">
                {po.supplier_no} ({po.country_code})
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Expected Arrival</p>
              <p className="text-sm font-medium text-ink">
                {po.expected_arrival_date
                  ? new Date(po.expected_arrival_date).toLocaleDateString()
                  : "Not specified"}
              </p>
              <p className="text-xs text-slate-400">
                Ship: {po.expected_ship_date ? new Date(po.expected_ship_date).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Ship className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Logistics & Incoterm</p>
              <p className="text-sm font-medium text-ink uppercase">
                {po.shipping_mode || "Standard"} — {po.incoterm || "FOB"}
              </p>
              {po.port_of_loading && (
                <p className="text-xs text-slate-400">Port: {po.port_of_loading}</p>
              )}
            </div>
          </div>
        </div>

        {po.notes && (
          <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Terms / Notes:</span> {po.notes}
          </div>
        )}

        <div className="p-6">
          <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            Purchase Order Line Items
          </h2>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">SKU / Item</th>
                  <th className="px-4 py-3 font-medium text-right">Quantity</th>
                  <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                  <th className="px-4 py-3 font-medium text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No line items recorded for this purchase order.
                    </td>
                  </tr>
                ) : (
                  lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{l.line_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{l.item_name}</div>
                        <div className="font-mono text-xs text-slate-400">{l.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                        {Number(l.qty).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {po.currency}{" "}
                        {(Number(l.unit_price_minor) / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">
                        {po.currency}{" "}
                        {(Number(l.line_total_minor) / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-medium text-xs text-slate-700 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-right font-semibold">Subtotal</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">
                    {po.currency} {(Number(po.subtotal_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {Number(po.tax_minor) > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-slate-500">Taxes</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {po.currency} {(Number(po.tax_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-slate-200 text-sm font-bold text-ink bg-slate-100/70">
                  <td colSpan={4} className="px-4 py-3 text-right">Total Order Value</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold">
                    {po.currency} {(Number(po.total_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
