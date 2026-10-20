import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { LabelsClient } from "./LabelsClient";

export default async function LabelsPage() {
  await requireAnyScope(["inventory.read"]);

  const [itemsRes, unitsRes, locationsRes] = await Promise.all([
    db.query(`
      select id, sku, name 
      from catalog.items 
      where is_active = true 
      order by sku
    `),
    db.query(`
      select 
        u.id, 
        u.serial_no, 
        u.internal_ref as build_ref, 
        i.sku as model_sku 
      from prod.units u
      join catalog.items i on i.id = u.item_id
      where u.status in ('in_stock', 'passed')
      order by u.serial_no desc
      limit 50
    `),
    db.query(`
      select id, code, name 
      from core.locations 
      where active = true 
      order by code
    `),
  ]);

  return (
    <LabelsClient
      items={itemsRes.rows}
      units={unitsRes.rows}
      locations={locationsRes.rows}
    />
  );
}
