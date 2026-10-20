import { db } from "@/lib/db";
import { requireAnyScope, getSession } from "@/lib/session";
import { InspectionsQueueClient } from "./InspectionsQueueClient";

export default async function QualityInspectionsQueuePage() {
  await requireAnyScope(["qc.inspect", "reports.read"]);
  const session = await getSession();

  const [unitsQueueRes, incomingQueueRes] = await Promise.all([
    db.query(`
      select 
        u.id,
        u.internal_ref,
        u.status,
        u.created_at::text as created_at,
        u.built_at::text as built_at,
        u.built_by,
        i.sku as model_sku,
        i.name as model_name,
        ao.ao_no as assembly_order_no,
        p.full_name as built_by_name
      from prod.units u
      join catalog.items i on i.id = u.item_id
      left join prod.assembly_orders ao on ao.id = u.ao_id
      left join core.profiles p on p.id = u.built_by
      where u.status in ('qc_hold', 'testing')
      order by u.built_at asc nulls last, u.created_at asc
    `),

    db.query(`
      select 
        grl.id,
        gr.grn_no,
        gr.received_at::text as received_date,
        i.sku,
        i.name as item_name,
        grl.qty_received,
        sup.name as supplier_name
      from proc.goods_receipt_lines grl
      join proc.goods_receipts gr on gr.id = grl.grn_id
      join catalog.items i on i.id = grl.item_id
      left join proc.suppliers sup on sup.id = gr.supplier_id
      where gr.status = 'draft'
      order by gr.received_at asc
      limit 50
    `),
  ]);

  return (
    <InspectionsQueueClient
      unitsQueue={unitsQueueRes.rows}
      incomingQueue={incomingQueueRes.rows}
      currentUserId={session?.userId || ""}
    />
  );
}
