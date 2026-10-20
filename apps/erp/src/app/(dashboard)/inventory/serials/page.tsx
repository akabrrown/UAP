import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { SerialsClient } from "./SerialsClient";

export default async function SerialsLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  await requireAnyScope(["inventory.read", "service.write"]);
  const { q } = await searchParams;

  let unitResult: any = null;
  let componentResult: any = null;
  let lotResult: any = null;

  if (q && q.trim()) {
    const query = q.trim();

    // 1. Try matching finished unit by serial_no or internal_ref
    const unitRes = await db.query(`
      select 
        u.id,
        u.serial_no,
        u.status,
        u.internal_ref as build_ref,
        u.created_at::text as created_at,
        u.built_at::text as completed_at,
        i.sku as model_sku,
        i.name as model_name,
        ao.ao_no as assembly_order_no,
        p.full_name as technician_name
      from prod.units u
      join catalog.items i on i.id = u.item_id
      left join prod.assembly_orders ao on ao.id = u.ao_id
      left join core.profiles p on p.id = u.built_by
      where u.serial_no = $1 or u.internal_ref = $1 or u.id::text = $1
      limit 1
    `, [query]);

    if (unitRes.rows.length > 0) {
      unitResult = unitRes.rows[0];

      // Fetch components installed in this unit (Genealogy Tree)
      const compRes = await db.query(`
        select 
          uc.id,
          uc.installed_at::text as installed_at,
          uc.removed_at::text as removed_at,
          uc.removed_reason as removal_reason,
          i.sku as component_sku,
          i.name as component_name,
          cs.serial_no as component_serial_no,
          l.lot_no,
          sup.name as supplier_name,
          l.unit_landed_cost_minor,
          t.ticket_no as removal_ticket_no
        from prod.unit_components uc
        join catalog.items i on i.id = uc.item_id
        left join inv.component_serials cs on cs.id = uc.component_serial_id
        left join inv.lots l on l.id = uc.lot_id
        left join proc.suppliers sup on sup.id = l.supplier_id
        left join svc.service_tickets t on t.id = uc.ticket_id
        where uc.unit_id = $1
        order by uc.installed_at asc
      `, [unitResult.id]);

      unitResult.components = compRes.rows;

      // Fetch tests and history
      const testsRes = await db.query(`
        select 
          tr.id,
          tr.test_type,
          tr.result,
          tr.created_at::text as created_at,
          tr.notes,
          p.full_name as tester_name
        from prod.test_runs tr
        left join core.profiles p on p.id = tr.run_by
        where tr.unit_id = $1
        order by tr.created_at asc
      `, [unitResult.id]);

      unitResult.tests = testsRes.rows;
    } else {
      // 2. Try matching component serial
      const csRes = await db.query(`
        select 
          cs.id,
          cs.serial_no,
          cs.status,
          cs.created_at::text as created_at,
          i.sku as component_sku,
          i.name as component_name,
          l.lot_no,
          loc.name as location_name,
          u.id as unit_id,
          u.serial_no as unit_serial_no,
          u.status as unit_status
        from inv.component_serials cs
        join catalog.items i on i.id = cs.item_id
        left join inv.lots l on l.id = cs.lot_id
        left join core.locations loc on loc.id = cs.location_id
        left join prod.unit_components uc on uc.component_serial_id = cs.id and uc.removed_at is null
        left join prod.units u on u.id = uc.unit_id
        where cs.serial_no = $1
        limit 1
      `, [query]);

      if (csRes.rows.length > 0) {
        componentResult = csRes.rows[0];
      } else {
        // 3. Try matching lot
        const lotRes = await db.query(`
          select 
            l.id,
            l.lot_no,
            l.received_on::text as received_on,
            l.unit_landed_cost_minor,
            i.sku as item_sku,
            i.name as item_name,
            sup.name as supplier_name
          from inv.lots l
          join catalog.items i on i.id = l.item_id
          left join proc.suppliers sup on sup.id = l.supplier_id
          where l.lot_no = $1
          limit 1
        `, [query]);

        if (lotRes.rows.length > 0) {
          lotResult = lotRes.rows[0];

          // Reverse trace: all units containing parts from this lot
          const unitsUsingLot = await db.query(`
            select distinct
              u.id as unit_id,
              u.serial_no as unit_serial_no,
              u.status as unit_status,
              u.completed_at::text as completed_at,
              i.sku as model_sku,
              cs.serial_no as component_serial_no
            from prod.unit_components uc
            join prod.units u on u.id = uc.unit_id
            join catalog.items i on i.id = u.item_id
            left join inv.component_serials cs on cs.id = uc.component_serial_id
            where uc.lot_id = $1 or cs.lot_id = $1
            order by u.serial_no
          `, [lotResult.id]);

          lotResult.units = unitsUsingLot.rows;
        }
      }
    }
  }

  return (
    <SerialsClient
      initialQuery={q || ""}
      unitResult={unitResult}
      componentResult={componentResult}
      lotResult={lotResult}
    />
  );
}
