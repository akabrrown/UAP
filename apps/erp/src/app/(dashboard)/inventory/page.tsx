import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  await requireAnyScope(["inventory.read"]);

  const [balancesRes, movementsRes, transfersRes] = await Promise.all([
    // Live stock balance grouped by item and location
    db.query(`
      SELECT 
        i.id as item_id,
        i.sku,
        i.name as item_name,
        i.uom,
        l.id as location_id,
        l.name as location_name,
        l.kind as location_kind,
        COALESCE(sum(sl.qty), 0)::numeric as on_hand_qty,
        COALESCE((
          SELECT sum(r.qty) 
          FROM inv.reservations r 
          WHERE r.item_id = i.id 
            AND (r.location_id IS NULL OR r.location_id = l.id) 
            AND r.status = 'active'
        ), 0)::numeric as reserved_qty,
        COALESCE(i.list_price_minor, 0)::bigint as unit_cost_minor
      FROM catalog.items i
      CROSS JOIN core.locations l
      LEFT JOIN inv.stock_ledger sl ON sl.item_id = i.id AND sl.location_id = l.id
      WHERE l.active = true
      GROUP BY i.id, i.sku, i.name, i.uom, l.id, l.name, l.kind, i.list_price_minor
      HAVING COALESCE(sum(sl.qty), 0) > 0 OR COALESCE((
          SELECT sum(r.qty) 
          FROM inv.reservations r 
          WHERE r.item_id = i.id 
            AND (r.location_id IS NULL OR r.location_id = l.id) 
            AND r.status = 'active'
        ), 0) > 0
      ORDER BY i.sku ASC, l.name ASC
    `),

    // Recent stock ledger transactions
    db.query(`
      SELECT 
        sl.id::text,
        sl.posted_at,
        sl.movement_type,
        sl.qty::numeric,
        sl.unit_cost_minor,
        sl.ref_type,
        i.sku,
        i.name as item_name,
        l.name as location_name
      FROM inv.stock_ledger sl
      JOIN catalog.items i ON i.id = sl.item_id
      JOIN core.locations l ON l.id = sl.location_id
      ORDER BY sl.posted_at DESC
      LIMIT 50
    `),

    // Transfers list
    db.query(`
      SELECT 
        t.id, t.transfer_no, t.status, t.created_at,
        l1.name as from_location, 
        l2.name as to_location,
        COALESCE((SELECT count(*) FROM inv.transfer_lines tl WHERE tl.transfer_id = t.id), 0)::int as line_count
      FROM inv.transfers t
      LEFT JOIN core.locations l1 ON l1.id = t.from_location_id
      LEFT JOIN core.locations l2 ON l2.id = t.to_location_id
      ORDER BY t.transfer_no DESC
      LIMIT 50
    `),
  ]);

  const stockBalances = balancesRes.rows.map((row) => ({
    ...row,
    on_hand_qty: Number(row.on_hand_qty),
    reserved_qty: Number(row.reserved_qty),
    unit_cost_minor: Number(row.unit_cost_minor),
  }));

  const stockMovements = movementsRes.rows.map((row) => ({
    ...row,
    posted_at: row.posted_at.toISOString(),
    qty: Number(row.qty),
    unit_cost_minor: row.unit_cost_minor ? Number(row.unit_cost_minor) : null,
  }));

  const transfers = transfersRes.rows.map((row) => ({
    ...row,
    created_at: row.created_at.toISOString(),
    line_count: Number(row.line_count),
  }));

  // Calculate metrics
  const uniqueSkus = new Set(stockBalances.filter((b) => b.on_hand_qty > 0).map((b) => b.sku)).size;
  const totalOnHand = stockBalances.reduce((acc, b) => acc + b.on_hand_qty, 0);
  const totalReserved = stockBalances.reduce((acc, b) => acc + b.reserved_qty, 0);
  const inTransitTransfers = transfers.filter((t) => t.status === "in_transit").length;

  return (
    <InventoryClient
      stockBalances={stockBalances}
      stockMovements={stockMovements}
      transfers={transfers}
      metrics={{
        totalSkus: uniqueSkus,
        totalOnHand,
        totalReserved,
        inTransitTransfers,
      }}
    />
  );
}
