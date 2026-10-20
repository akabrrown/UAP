import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { ProductionClient, AssemblyOrderRow } from "./ProductionClient";

export default async function ProductionPage() {
  await requireAnyScope(["production.plan", "production.work", "tests.record", "qc.inspect"]);

  const result = await db.query<AssemblyOrderRow>(`
    select 
      ao.id, 
      ao.ao_no, 
      ao.status, 
      ao.qty_planned as qty, 
      i.name as model_name, 
      i.sku,
      ao.priority,
      ao.purpose,
      ao.planned_start::text as planned_date,
      ao.planned_end::text as planned_end,
      ao.created_at::text as created_at
    from prod.assembly_orders ao
    join catalog.items i on i.id = ao.item_id
    order by ao.created_at desc, ao.ao_no desc
  `);

  return <ProductionClient initialOrders={result.rows} />;
}
