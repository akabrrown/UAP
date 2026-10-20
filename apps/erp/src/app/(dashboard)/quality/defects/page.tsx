import { Metadata } from "next";
import { db } from "@/lib/db";
import { DefectsClient, DefectItem } from "./DefectsClient";

export const metadata: Metadata = {
  title: "Defect Analytics | Quality & Production | UAP",
};

export default async function QualityDefectsPage() {
  const defectsRes = await db.query(`
    select 
      d.id,
      coalesce(dc.code, 'DEFECT') as code,
      coalesce(dc.name, d.notes) as name,
      coalesce(dc.category, 'assembly') as category,
      d.severity,
      coalesce(i.name, 'Finished Unit / Component') as model_name,
      u.internal_ref as unit_ref,
      coalesce(d.notes, '') as notes,
      d.created_at
    from prod.qc_defects d
    left join prod.defect_codes dc on dc.id = d.defect_code_id
    left join catalog.items i on i.id = d.item_id
    left join prod.qc_inspections qi on qi.id = d.inspection_id
    left join prod.units u on u.id = qi.unit_id
    order by d.created_at desc
  `);

  const defects: DefectItem[] = defectsRes.rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    severity: row.severity as DefectItem["severity"],
    model_name: row.model_name,
    unit_ref: row.unit_ref,
    notes: row.notes,
    created_at: new Date(row.created_at).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f4b41a] uppercase tracking-wider">
            Quality Assurance
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Defect Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log and review quality defects, Pareto trends, and root causes across assembly units and incoming receipts.
          </p>
        </div>
      </div>

      <DefectsClient defects={defects} />
    </div>
  );
}
