import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, MapPin, DollarSign, Package } from "lucide-react";
import { requireAnyScope } from "@/lib/session";
import { OrderActions } from "./OrderActions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyScope(["orders.read", "orders.write"]);
  const { id } = await params;

  const orderRes = await db.query(
    `select io.*, ca.name as customer_name, ca.account_no
     from sales.internal_orders io
     join core.customer_accounts ca on ca.id = io.account_id
     where io.id = $1`,
    [id]
  );

  const order = orderRes.rows[0];
  if (!order) {
    notFound();
  }

  const linesRes = await db.query(
    `select ol.*, i.sku, i.name as item_name
     from sales.internal_order_lines ol
     join catalog.items i on i.id = ol.item_id
     where ol.order_id = $1
     order by ol.line_no asc`,
    [id]
  );

  const lines = linesRes.rows;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sales Orders
        </Link>
        <div className="flex items-center gap-3">
          <OrderActions
            orderId={order.id}
            orderNo={order.order_no}
            status={order.status}
            deliveryPoint={order.delivery_point}
            requiredBy={order.required_by}
            notes={order.notes}
          />
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              order.status === "completed" || order.status === "dispatched"
                ? "bg-pass-bg text-pass"
                : order.status === "cancelled"
                ? "bg-fail-bg text-fail"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink font-mono">{order.order_no}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Created {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Total Value</span>
            <span className="text-xl font-bold text-ink tabular-nums">
              {order.currency}{" "}
              {(Number(order.total_minor) / 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Customer Account</p>
              <p className="text-sm font-semibold text-ink">{order.customer_name}</p>
              <p className="text-xs font-mono text-slate-400">{order.account_no}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Required By Date</p>
              <p className="text-sm font-medium text-ink">
                {order.required_by ? new Date(order.required_by).toLocaleDateString() : "Immediate"}
              </p>
              <p className="text-xs text-slate-400 capitalize">Source: {order.source_kind || "Direct"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Delivery Point</p>
              <p className="text-sm font-medium text-ink">
                {order.delivery_point || "Customer Address / Dispatch Bay"}
              </p>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Notes:</span> {order.notes}
          </div>
        )}

        <div className="p-6">
          <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            Order Line Items
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
                      No line items recorded for this order.
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
                        {order.currency}{" "}
                        {(Number(l.unit_price_minor) / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">
                        {order.currency}{" "}
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
                    {order.currency} {(Number(order.subtotal_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {Number(order.discount_minor) > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-slate-500">Discount</td>
                    <td className="px-4 py-2 text-right font-mono text-fail">
                      -{order.currency} {(Number(order.discount_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {Number(order.tax_minor) > 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-slate-500">Taxes</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {order.currency} {(Number(order.tax_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-slate-200 text-sm font-bold text-ink bg-slate-100/70">
                  <td colSpan={4} className="px-4 py-3 text-right">Total Payable</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold">
                    {order.currency} {(Number(order.total_minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
