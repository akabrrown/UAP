import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAnyScope, getSession } from "@/lib/session";
import { BenchWorkspaceClient } from "./BenchWorkspaceClient";

export default async function BenchWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyScope(["production.work", "production.plan", "qc.inspect"]);
  const { id } = await params;
  const session = await getSession();

  const [unitRes, componentsRes, testsRes, stepsRes] = await Promise.all([
    db.query(`
      select 
        u.id,
        u.internal_ref,
        u.serial_no,
        u.status,
        u.item_id,
        u.ao_id,
        u.built_by,
        u.created_at::text as created_at,
        u.updated_at::text as updated_at,
        u.built_at::text as built_at,
        u.qc_passed_at::text as qc_passed_at,
        u.labour_minutes_total,
        i.sku as model_sku,
        i.name as model_name,
        ao.ao_no as assembly_order_no,
        p.full_name as technician_name
      from prod.units u
      join catalog.items i on i.id = u.item_id
      left join prod.assembly_orders ao on ao.id = u.ao_id
      left join core.profiles p on p.id = u.built_by
      where u.id = $1
    `, [id]),

    db.query(`
      select 
        uc.id,
        uc.installed_at::text as installed_at,
        uc.removed_at::text as removed_at,
        i.sku as component_sku,
        i.name as component_name,
        cs.serial_no as component_serial_no,
        l.lot_no
      from prod.unit_components uc
      join catalog.items i on i.id = uc.item_id
      left join inv.component_serials cs on cs.id = uc.component_serial_id
      left join inv.lots l on l.id = uc.lot_id
      where uc.unit_id = $1
      order by uc.installed_at asc
    `, [id]),

    db.query(`
      select 
        tr.id,
        tr.test_type,
        tr.result,
        coalesce(tr.tool, '') as notes,
        tr.created_at::text as created_at,
        p.full_name as tester_name
      from prod.test_runs tr
      left join core.profiles p on p.id = tr.run_by
      where tr.unit_id = $1
      order by tr.created_at desc
    `, [id]),

    db.query(`
      select 
        us.id,
        rs.step_no,
        us.status,
        us.started_at::text as started_at,
        us.completed_at::text as completed_at,
        us.minutes as duration_minutes,
        rs.name as step_name,
        rs.instructions as step_description,
        rs.is_mandatory
      from prod.unit_steps us
      join prod.routing_steps rs on rs.id = us.step_id
      where us.unit_id = $1
      order by rs.step_no asc
    `, [id]).catch(() => ({ rows: [] })),
  ]);

  if (unitRes.rows.length === 0) {
    notFound();
  }

  return (
    <BenchWorkspaceClient
      unit={unitRes.rows[0]}
      components={componentsRes.rows}
      tests={testsRes.rows}
      steps={stepsRes.rows}
      currentUserId={session?.userId || ""}
    />
  );
}
