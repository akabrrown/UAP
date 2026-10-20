import { db } from "@/lib/db";
import { requireAnyScope, getSession } from "@/lib/session";
import { TechnicianQueueClient } from "./TechnicianQueueClient";

export default async function TechnicianQueuePage() {
  await requireAnyScope(["production.work", "production.plan"]);
  const session = await getSession();

  const [assignedUnitsRes, unassignedCountRes] = await Promise.all([
    db.query(`
      select 
        u.id,
        u.internal_ref,
        u.serial_no,
        u.status,
        u.created_at::text as created_at,
        u.updated_at::text as updated_at,
        u.built_at::text as built_at,
        i.sku as model_sku,
        i.name as model_name,
        ao.ao_no as assembly_order_no
      from prod.units u
      join catalog.items i on i.id = u.item_id
      left join prod.assembly_orders ao on ao.id = u.ao_id
      where u.built_by = $1 and u.status in ('building', 'testing', 'rework', 'qc_hold')
      order by u.created_at asc
    `, [session?.userId]),

    db.query(`
      select count(*) as count 
      from prod.units 
      where status = 'allocated' and built_by is null
    `),
  ]);

  return (
    <TechnicianQueueClient
      assignedUnits={assignedUnitsRes.rows}
      unassignedAvailableCount={Number(unassignedCountRes.rows[0]?.count || 0)}
      technicianName={session?.fullName || "Technician"}
    />
  );
}
