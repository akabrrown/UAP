import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { LedgerClient, type LedgerRow } from "./LedgerClient";

export default async function StockLedgerPage() {
  await requireAnyScope(["inventory.read", "reports.read"]);

  const [ledgerRes, locationsRes, itemsRes] = await Promise.all([
    db.query(`
      select 
        sl.id,
        sl.posted_at::text as posted_at,
        sl.movement_type,
        sl.qty,
        sl.unit_cost_minor,
        sl.ref_type,
        sl.ref_id,
        sl.reason,
        i.sku,
        i.name as item_name,
        loc.code as location_code,
        loc.name as location_name,
        coalesce(p.full_name, 'System') as actor_name
      from inv.stock_ledger sl
      join catalog.items i on i.id = sl.item_id
      left join core.locations loc on loc.id = sl.location_id
      left join core.profiles p on p.id = sl.created_by
      order by sl.posted_at desc
      limit 250
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
      order by sku
    `),
  ]);

  return (
    <LedgerClient
      initialRows={ledgerRes.rows}
      locations={locationsRes.rows}
      items={itemsRes.rows}
    />
  );
}
