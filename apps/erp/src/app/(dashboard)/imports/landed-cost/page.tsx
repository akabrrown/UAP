import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { LandedCostListClient } from "./LandedCostListClient";

export default async function LandedCostListPage() {
  await requireAnyScope(["landedcost.post", "imports.write", "gl.read"]);

  const [runsRes, deliveredShipmentsRes] = await Promise.all([
    db.query(`
      select 
        lcr.id,
        lcr.run_no,
        lcr.status,
        lcr.total_allocated_minor,
        lcr.created_at::text as created_at,
        lcr.posted_at::text as posted_at,
        s.shipment_no,
        sup.name as supplier_name,
        p.full_name as posted_by_name
      from proc.landed_cost_runs lcr
      join proc.shipments s on s.id = lcr.shipment_id
      left join proc.suppliers sup on sup.id = s.supplier_id
      left join core.profiles p on p.id = lcr.posted_by
      order by lcr.created_at desc
    `),
    db.query(`
      select 
        s.id,
        s.shipment_no,
        sup.name as supplier_name,
        s.currency
      from proc.shipments s
      left join proc.suppliers sup on sup.id = s.supplier_id
      where s.status in ('delivered', 'cleared')
      order by s.created_at desc
    `),
  ]);

  return (
    <LandedCostListClient
      initialRuns={runsRes.rows}
      deliveredShipments={deliveredShipmentsRes.rows}
    />
  );
}
