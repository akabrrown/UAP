import { db } from "@/lib/db";
import { BarChart3, TrendingUp, Package, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { requireAnyScope } from "@/lib/session";
import { ExportReportsButton } from "./ExportReportsButton";

export default async function ReportsPage() {
  await requireAnyScope(["reports.read"]);

  const [stockRes, mfgRes, svcRes, finRes, catRes, svcKindsRes, unitsRes] = await Promise.all([
    db.query(`
      select 
        coalesce(sum(sl.qty * coalesce(i.list_price_minor, 0)), 0) as total_val_minor,
        coalesce(sum(sl.qty), 0) as total_units
      from inv.stock_ledger sl
      join catalog.items i on i.id = sl.item_id
    `),
    db.query(`
      select 
        count(*) filter (where status in ('draft', 'planned', 'awaiting_materials', 'ready', 'released', 'in_progress', 'in_qc')) as active_assemblies,
        count(*) filter (where status = 'completed') as completed_assemblies
      from prod.assembly_orders
    `),
    db.query(`
      select 
        count(*) filter (where status not in ('closed', 'cancelled')) as open_tickets,
        count(*) filter (where status not in ('closed', 'cancelled') and priority in ('high', 'urgent')) as urgent_tickets,
        count(*) filter (where status = 'closed') as closed_tickets
      from svc.service_tickets
    `),
    db.query(`
      select 
        coalesce(sum(total_minor), 0) as total_invoiced,
        count(*) as invoice_count
      from fin.invoices
      where status != 'draft'
    `),
    db.query(`
      select 
        c.name as category_name, 
        count(distinct i.id) as item_count,
        coalesce(sum(sl.qty), 0) as total_qty
      from catalog.categories c
      join catalog.items i on i.category_id = c.id
      left join inv.stock_ledger sl on sl.item_id = i.id
      group by c.name
      order by total_qty desc
      limit 6
    `),
    db.query(`
      select 
        kind, 
        count(*) as count 
      from svc.service_tickets 
      group by kind 
      order by count desc
    `),
    db.query(`
      select 
        count(*) filter (where qc_passed_at is not null) as total_passed,
        count(*) filter (where status in ('qc_hold', 'rework', 'scrapped')) as total_failed
      from prod.units
    `)
  ]);

  const stock = stockRes.rows[0] || { total_val_minor: "0", total_units: "0" };
  const mfg = mfgRes.rows[0] || { active_assemblies: 0, completed_assemblies: 0 };
  const units = unitsRes?.rows[0] || { total_passed: 0, total_failed: 0 };
  const svc = svcRes.rows[0] || { open_tickets: 0, urgent_tickets: 0, closed_tickets: 0 };
  const fin = finRes.rows[0] || { total_invoiced: "0", invoice_count: 0 };
  const categories = catRes.rows;
  const serviceKinds = svcKindsRes.rows;

  const totalStockVal = Number(stock.total_val_minor) / 100;
  const totalInvoiced = Number(fin.total_invoiced) / 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Real-time enterprise metrics, production throughput, and warranty analytics.</p>
        </div>
        <ExportReportsButton
          data={{
            totalStockVal,
            totalUnits: Number(stock.total_units) || 0,
            activeAssemblies: Number(mfg.active_assemblies) || 0,
            completedAssemblies: Number(mfg.completed_assemblies) || 0,
            openTickets: Number(svc.open_tickets) || 0,
            urgentTickets: Number(svc.urgent_tickets) || 0,
            totalInvoiced,
            invoiceCount: Number(fin.invoice_count) || 0,
            categories,
            serviceKinds,
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Total Stock Value</h3>
            <div className="p-2 bg-navy-50 text-navy-800 rounded-full">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-ink">
            GHS {totalStockVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            {Number(stock.total_units).toLocaleString()} physical units on hand
          </div>
        </div>

        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Active Assembly Orders</h3>
            <div className="p-2 bg-gold-50 text-gold-700 rounded-full">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-ink">{mfg.active_assemblies}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            {mfg.completed_assemblies} orders completed
          </div>
        </div>

        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Open Service Tickets</h3>
            <div className="p-2 bg-fail-bg text-fail rounded-full">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-ink">{svc.open_tickets}</div>
          <div className={`text-xs flex items-center gap-1 font-medium ${Number(svc.urgent_tickets) > 0 ? 'text-fail' : 'text-slate-500'}`}>
            {svc.urgent_tickets} high/urgent priority
          </div>
        </div>

        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Invoiced Revenue</h3>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-full">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-ink">
            GHS {totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-pass flex items-center gap-1 font-medium">
            {fin.invoice_count} billed invoices
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category inventory breakdown */}
        <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Inventory by Category</h2>
            <span className="text-xs text-slate-500">Units on hand</span>
          </div>
          <div className="p-6">
            {categories.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No inventory categories found.</p>
            ) : (
              <div className="space-y-4">
                {categories.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-ink">{c.category_name}</span>
                      <span className="text-xs text-slate-400">{c.item_count} unique items</span>
                    </div>
                    <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {Number(c.total_qty).toLocaleString()} pcs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Service and Production Quality */}
        <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Quality & Warranty Breakdown</h2>
            <span className="text-xs text-slate-500">Live operational stats</span>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Manufacturing Quality</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-100 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-pass shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Passed QA</p>
                    <p className="text-lg font-semibold text-ink">{Number(units.total_passed).toLocaleString()} units</p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100 flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-fail shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Failed / Rework</p>
                    <p className="text-lg font-semibold text-ink">{Number(units.total_failed).toLocaleString()} units</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Service Tickets by Kind</h3>
              {serviceKinds.length === 0 ? (
                <p className="text-sm text-slate-500">No service tickets recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {serviceKinds.map((sk, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-b-0">
                      <span className="capitalize text-slate-700">{sk.kind.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-ink">{sk.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
