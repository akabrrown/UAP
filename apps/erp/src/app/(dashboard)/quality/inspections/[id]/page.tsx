import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAnyScope, getSession } from "@/lib/session";
import { FinishedUnitInspectionClient } from "./FinishedUnitInspectionClient";

export default async function FinishedUnitInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyScope(["qc.inspect"]);
  const { id } = await params;
  const session = await getSession();

  const [unitRes, componentsRes, testsRes, defectCodesRes] = await Promise.all([
    db.query(`
      select 
        u.id,
        u.internal_ref,
        u.serial_no,
        u.status,
        u.built_by,
        u.created_at::text as created_at,
        u.built_at::text as built_at,
        i.sku as model_sku,
        i.name as model_name,
        ao.ao_no as assembly_order_no,
        p.full_name as built_by_name
      from prod.units u
      join catalog.items i on i.id = u.item_id
      left join prod.assembly_orders ao on ao.id = u.ao_id
      left join core.profiles p on p.id = u.built_by
      where u.id = $1
    `, [id]),

    db.query(`
      select 
        uc.id,
        i.sku as component_sku,
        i.name as component_name,
        cs.serial_no as component_serial_no,
        l.lot_no,
        sup.name as supplier_name
      from prod.unit_components uc
      join catalog.items i on i.id = uc.item_id
      left join inv.component_serials cs on cs.id = uc.component_serial_id
      left join inv.lots l on l.id = uc.lot_id
      left join proc.suppliers sup on sup.id = l.supplier_id
      where uc.unit_id = $1 and uc.removed_at is null
      order by uc.installed_at asc
    `, [id]),

    db.query(`
      select 
        tr.id,
        tr.test_type,
        tr.result,
        tr.notes,
        tr.created_at::text as created_at
      from prod.test_runs tr
      where tr.unit_id = $1
      order by tr.created_at desc
    `, [id]),

    db.query(`
      select id, code, description, category 
      from prod.defect_codes 
      where active = true 
      order by code
    `).catch(() => ({ rows: [] })),
  ]);

  if (unitRes.rows.length === 0) {
    notFound();
  }

  return (
    <FinishedUnitInspectionClient
      unit={unitRes.rows[0]}
      components={componentsRes.rows}
      tests={testsRes.rows}
      defectCodes={defectCodesRes.rows}
      currentUserId={session?.userId || ""}
    />
  );
}
