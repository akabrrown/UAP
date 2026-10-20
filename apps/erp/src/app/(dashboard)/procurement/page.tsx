import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { ProcurementClient, PurchaseOrderRow } from "./ProcurementClient";

export default async function ProcurementPage() {
  await requireAnyScope(["procurement.write", "procurement.approve", "inventory.receive", "reports.read"]);

  const result = await db.query<PurchaseOrderRow>(`
    select 
      po.id, 
      po.po_no, 
      po.status, 
      po.currency, 
      po.total_minor, 
      po.expected_arrival_date::text as expected_arrival_date, 
      po.shipping_mode,
      po.created_at::text as created_at,
      s.name as supplier_name
    from proc.purchase_orders po
    join proc.suppliers s on s.id = po.supplier_id
    order by po.created_at desc, po.po_no desc
  `);

  return <ProcurementClient initialOrders={result.rows} />;
}
