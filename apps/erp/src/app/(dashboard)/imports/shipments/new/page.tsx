import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { NewShipmentClient } from "./NewShipmentClient";

export default async function NewShipmentPage() {
  await requireAnyScope(["imports.write", "procurement.write"]);

  const [suppliersRes, posRes, itemsRes] = await Promise.all([
    db.query(`
      select id, name, currency, country 
      from proc.suppliers 
      where status = 'active'
      order by name
    `),
    db.query(`
      select 
        po.id as po_id,
        po.po_no,
        po.supplier_id,
        pol.id as po_line_id,
        pol.item_id,
        i.sku,
        i.name as item_name,
        pol.qty as ordered_qty,
        pol.unit_price_minor,
        po.currency
      from proc.purchase_order_lines pol
      join proc.purchase_orders po on po.id = pol.po_id
      join catalog.items i on i.id = pol.item_id
      where po.status in ('confirmed', 'partially_received', 'sent')
      order by po.po_no desc, pol.line_no asc
    `),
    db.query(`
      select id, sku, name 
      from catalog.items 
      where is_active = true 
      order by sku
    `),
  ]);

  return (
    <NewShipmentClient
      suppliers={suppliersRes.rows}
      poLines={posRes.rows}
      catalogItems={itemsRes.rows}
    />
  );
}
