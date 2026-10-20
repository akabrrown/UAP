import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { AdjustmentsClient, type AdjustmentRow } from "./AdjustmentsClient";

export default async function AdjustmentsPage() {
  await requireAnyScope(["inventory.adjust", "inventory.adjust.approve", "inventory.read"]);

  const [adjustmentsRes, locationsRes, itemsRes] = await Promise.all([
    db.query(`
      select 
        a.id,
        a.adj_no,
        a.reason,
        a.status,
        a.total_value_minor,
        a.created_at::text as created_at,
        a.posted_at::text as posted_at,
        loc.code as location_code,
        loc.name as location_name,
        count(distinct al.id)::int as lines_count
      from inv.adjustments a
      left join core.locations loc on loc.id = a.location_id
      left join inv.adjustment_lines al on al.adjustment_id = a.id
      group by a.id, loc.code, loc.name
      order by a.created_at desc
    `),
    db.query(`
      select id, code, name 
      from core.locations 
      where active = true 
      order by code
    `),
    db.query(`
      select id, sku, name 
      from catalog.items 
      where is_active = true 
      order by sku
    `),
  ]);

  return (
    <AdjustmentsClient
      initialAdjustments={adjustmentsRes.rows}
      locations={locationsRes.rows}
      items={itemsRes.rows}
    />
  );
}
