import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Cpu, Calendar, CheckCircle2, Box, Layers, Play } from "lucide-react";
import { requireAnyScope } from "@/lib/session";
import { ReleaseButton } from "./release-button";
import { AssemblyOrderActions } from "./AssemblyOrderActions";

export default async function AssemblyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyScope(["production.plan", "production.work", "tests.record", "qc.inspect"]);
  const { id } = await params;

  const aoRes = await db.query(
    `select ao.*, 
            i.name as item_name, 
            i.sku as item_sku, 
            b.name as bom_name, 
            b.version_no as bom_version
     from prod.assembly_orders ao
     join catalog.items i on i.id = ao.item_id
     join catalog.boms b on b.id = ao.bom_id
     where ao.id = $1`,
    [id]
  );

  const ao = aoRes.rows[0];
  if (!ao) {
    notFound();
  }

  const [materialsRes, unitsRes] = await Promise.all([
    db.query(
      `select aom.*, i.name as component_name, i.sku as component_sku
       from prod.assembly_order_materials aom
       join catalog.items i on i.id = aom.item_id
       where aom.ao_id = $1
       order by i.name asc`,
      [id]
    ),
    db.query(
      `select u.*, l.name as location_name
       from prod.units u
       left join core.locations l on l.id = u.location_id
       where u.ao_id = $1
       order by u.internal_ref asc`,
      [id]
    )
  ]);

  const materials = materialsRes.rows;
  const units = unitsRes.rows;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/production"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assembly Orders
        </Link>
        <div className="flex items-center gap-3">
          <AssemblyOrderActions
            aoId={ao.id}
            aoNo={ao.ao_no}
            status={ao.status}
            priority={ao.priority}
            plannedStart={ao.planned_start}
            plannedEnd={ao.planned_end}
            notes={ao.notes}
          />
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              ao.status === "completed"
                ? "bg-pass-bg text-pass"
                : ao.status === "released" || ao.status === "in_progress"
                ? "bg-navy-50 text-navy-800"
                : ao.status === "cancelled"
                ? "bg-fail-bg text-fail"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {ao.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink font-mono">{ao.ao_no}</h1>
            <p className="text-sm text-slate-700 mt-1 font-medium">
              {ao.item_name} <span className="font-mono text-xs text-slate-400">({ao.item_sku})</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Planned Quantity</span>
              <span className="text-xl font-bold text-ink">{ao.qty_planned} units</span>
            </div>
            {(ao.status === "draft" || ao.status === "planned") && (
              <ReleaseButton aoId={ao.id} />
            )}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <Layers className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Bill of Materials</p>
              <p className="text-sm font-semibold text-ink">{ao.bom_name}</p>
              <p className="text-xs font-mono text-slate-400">Rev v{ao.bom_version}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Planned Schedule</p>
              <p className="text-sm font-medium text-ink">
                {ao.planned_start ? new Date(ao.planned_start).toLocaleDateString() : "Immediate"}
              </p>
              <p className="text-xs text-slate-400">
                End: {ao.planned_end ? new Date(ao.planned_end).toLocaleDateString() : "TBD"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Cpu className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Priority & Purpose</p>
              <p className="text-sm font-medium text-ink capitalize">
                Level {ao.priority} — {ao.purpose}
              </p>
            </div>
          </div>
        </div>

        {/* Section: Exploded BOM Materials */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            <Box className="w-4 h-4 text-slate-500" />
            Exploded BOM Materials
          </h2>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Component Item</th>
                  <th className="px-4 py-3 font-medium text-right">Required Qty</th>
                  <th className="px-4 py-3 font-medium">Alt Group</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      {ao.status === "draft" || ao.status === "planned"
                        ? "BOM materials will explode into reservations upon release."
                        : "No material requirements recorded."}
                    </td>
                  </tr>
                ) : (
                  materials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-navy-800">{m.component_sku}</td>
                      <td className="px-4 py-3 font-medium text-ink">{m.component_name}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                        {Number(m.qty_required).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{m.alt_group || "Primary"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{m.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Shop Floor Units */}
        <div className="p-6">
          <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-500" />
            Serialized Units Tracking ({units.length} generated)
          </h2>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Internal Ref</th>
                  <th className="px-4 py-3 font-medium">Serial No</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">QC Passed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      {ao.status === "draft" || ao.status === "planned"
                        ? "Individual unit tracking records are generated once the order is released."
                        : "No units instantiated for this order."}
                    </td>
                  </tr>
                ) : (
                  units.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-navy-800">{u.internal_ref}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{u.serial_no || "Unassigned"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                          {u.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{u.location_name || "Shop Floor"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u.qc_passed_at ? (
                          <span className="text-pass flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {new Date(u.qc_passed_at).toLocaleDateString()}
                          </span>
                        ) : (
                          "Pending"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
