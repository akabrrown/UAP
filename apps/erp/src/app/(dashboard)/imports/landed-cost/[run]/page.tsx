import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { LandedCostDetailClient } from "./LandedCostDetailClient";

export default async function LandedCostDetailPage({
  params,
}: {
  params: Promise<{ run: string }>;
}) {
  const { run: runId } = await params;
  await requireAnyScope(["landedcost.post", "imports.write", "gl.read"]);

  const runRes = await db.query(`
    select 
      lcr.id,
      lcr.run_no,
      lcr.status,
      lcr.total_allocated_minor,
      lcr.notes,
      lcr.created_at::text as created_at,
      lcr.posted_at::text as posted_at,
      lcr.reversed_at::text as reversed_at,
      s.id as shipment_id,
      s.shipment_no,
      s.currency,
      sup.name as supplier_name,
      p.full_name as posted_by_name
    from proc.landed_cost_runs lcr
    join proc.shipments s on s.id = lcr.shipment_id
    left join proc.suppliers sup on sup.id = s.supplier_id
    left join core.profiles p on p.id = lcr.posted_by
    where lcr.id = $1
  `, [runId]);

  if (runRes.rows.length === 0) {
    notFound();
  }

  const run = runRes.rows[0];

  const [linesRes, chargesRes] = await Promise.all([
    db.query(`
      select 
        sl.id as line_id,
        sl.item_id,
        sl.qty_shipped,
        sl.unit_value_minor,
        sl.currency,
        i.sku,
        i.name as item_name,
        coalesce(sum(lca.amount_minor), 0) as allocated_charges_minor
      from proc.shipment_lines sl
      join catalog.items i on i.id = sl.item_id
      left join proc.landed_cost_allocations lca 
        on lca.run_id = $1 and lca.basis_value = (sl.unit_value_minor * sl.qty_shipped)::text
      where sl.shipment_id = $2
      group by sl.id, sl.item_id, sl.qty_shipped, sl.unit_value_minor, sl.currency, i.sku, i.name
      order by i.sku
    `, [runId, run.shipment_id]),

    db.query(`
      select 
        sc.id,
        sc.charge_type,
        sc.description,
        sc.amount_minor,
        sc.currency,
        sc.amount_base_minor,
        sc.allocation_basis,
        sc.status
      from proc.shipment_charges sc
      where sc.shipment_id = $1
      order by sc.charge_type
    `, [run.shipment_id]),
  ]);

  return (
    <LandedCostDetailClient
      run={run}
      lines={linesRes.rows}
      charges={chargesRes.rows}
    />
  );
}
