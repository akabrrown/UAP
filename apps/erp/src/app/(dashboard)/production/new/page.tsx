import { db } from "@/lib/db";
import NewAssemblyOrderClient from "./NewAssemblyOrderClient";
import { requireAnyScope } from "@/lib/session";

export default async function NewAssemblyOrderPage() {
  await requireAnyScope(["production.plan"]);
  
  const [bomsRes, routingsRes, ordersRes] = await Promise.all([
    db.query(`
      select b.id, b.item_id, i.name as item_name, i.sku, b.version
      from catalog.boms b
      join catalog.items i on i.id = b.item_id
      where b.status = 'active'
      order by i.name
    `),
    db.query(`
      select id, name, version
      from prod.routings
      where active = true
      order by name
    `),
    db.query(`
      select id, order_no, delivery_point
      from sales.internal_orders
      where status not in ('cancelled', 'fulfilled')
      order by created_at desc
      limit 30
    `),
  ]);
  
  return (
    <NewAssemblyOrderClient
      boms={bomsRes.rows}
      routings={routingsRes.rows}
      orders={ordersRes.rows}
    />
  );
}
