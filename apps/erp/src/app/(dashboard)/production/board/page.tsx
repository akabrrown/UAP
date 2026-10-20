import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { ProductionBoardClient, type UnitBoardCard } from "./ProductionBoardClient";

export default async function ProductionBoardPage() {
  await requireAnyScope(["production.plan", "production.work", "qc.inspect", "reports.read"]);

  const [unitsRes, modelsRes, techniciansRes] = await Promise.all([
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
        ao.ao_no as assembly_order_no,
        p.full_name as technician_name,
        p.id as technician_id
      from prod.units u
      join catalog.items i on i.id = u.item_id
      left join prod.assembly_orders ao on ao.id = u.ao_id
      left join core.profiles p on p.id = u.built_by
      where u.status not in ('scrapped')
      order by u.created_at asc
    `),
    db.query(`
      select distinct i.sku, i.name 
      from prod.units u
      join catalog.items i on i.id = u.item_id
      order by i.sku
    `),
    db.query(`
      select distinct p.id, p.full_name 
      from core.profiles p
      join prod.units u on u.built_by = p.id
      order by p.full_name
    `),
  ]);

  return (
    <ProductionBoardClient
      initialUnits={unitsRes.rows}
      models={modelsRes.rows}
      technicians={techniciansRes.rows}
    />
  );
}
