import { Metadata } from "next";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { ReworkClient, ReworkOrderRow } from "./ReworkClient";

export const metadata: Metadata = {
  title: "Rework Orders | Quality & Production | UAP",
};

export default async function QualityReworkPage() {
  const session = await getSession();

  const reworkRes = await db.query(`
    select 
      r.id,
      r.rework_no,
      r.unit_id,
      u.internal_ref as unit_ref,
      u.serial_no,
      i.name as model_name,
      i.sku,
      r.status,
      r.description,
      r.assigned_to,
      p.full_name as technician_name,
      r.created_at,
      r.resolved_at,
      coalesce(
        json_agg(
          json_build_object(
            'code', coalesce(dc.code, 'DEFECT'),
            'name', coalesce(dc.name, d.notes),
            'severity', d.severity,
            'notes', d.notes
          )
        ) filter (where d.id is not null), '[]'::json
      ) as defects
    from prod.rework_orders r
    join prod.units u on u.id = r.unit_id
    join catalog.items i on i.id = u.item_id
    left join core.profiles p on p.id = r.assigned_to
    left join prod.qc_defects d on d.inspection_id = r.qc_inspection_id
    left join prod.defect_codes dc on dc.id = d.defect_code_id
    group by r.id, u.internal_ref, u.serial_no, i.name, i.sku, p.full_name
    order by r.created_at desc
  `);

  const reworkOrders: ReworkOrderRow[] = reworkRes.rows.map((row) => ({
    id: row.id,
    rework_no: row.rework_no,
    unit_id: row.unit_id,
    unit_ref: row.unit_ref,
    serial_no: row.serial_no,
    model_name: row.model_name,
    sku: row.sku,
    status: row.status as ReworkOrderRow["status"],
    description: row.description || "",
    assigned_to: row.assigned_to,
    technician_name: row.technician_name,
    created_at: new Date(row.created_at).toISOString(),
    resolved_at: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    defects: Array.isArray(row.defects) ? row.defects : [],
  }));

  const userRole = session?.role || "assembly_technician";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f4b41a] uppercase tracking-wider">
            Production & Quality
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Rework Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track and resolve units flagged with defects during quality inspection. (Section 08 Workflow)
          </p>
        </div>
      </div>

      <ReworkClient
        reworkOrders={reworkOrders}
        currentUserRole={userRole}
        currentUserId={session?.userId || ""}
      />
    </div>
  );
}
