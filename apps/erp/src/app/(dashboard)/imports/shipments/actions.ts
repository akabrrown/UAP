"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createShipment(data: {
  supplierId: string;
  mode: string;
  incoterm?: string;
  blAwbNo?: string;
  containerNos?: string[];
  vesselOrFlight?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  etd?: string;
  eta: string;
  freeDays?: number;
  currency?: string;
  notes?: string;
  lines: Array<{
    poLineId?: string;
    itemId: string;
    qtyShipped: number;
    unitValueMinor: number;
    currency: string;
    weightKg?: number;
    volumeCbm?: number;
  }>;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const containers = data.containerNos && data.containerNos.length > 0 
      ? data.containerNos 
      : [];

    const freeDays = data.freeDays ? Number(data.freeDays) : 14;

    const shpRes = await client.query(
      `insert into proc.shipments (
        shipment_no, supplier_id, mode, status, incoterm, bl_awb_no,
        container_nos, vessel_or_flight, port_of_loading, port_of_discharge,
        etd, eta, original_eta, free_days, currency, notes
      ) values (
        core.next_doc_no('SHP'), $1, $2, 'booked', $3, $4,
        $5, $6, $7, $8,
        $9, $10, $10, $11, $12, $13
      ) returning id, shipment_no`,
      [
        data.supplierId || null,
        data.mode || "sea",
        data.incoterm || null,
        data.blAwbNo || null,
        containers,
        data.vesselOrFlight || null,
        data.portOfLoading || null,
        data.portOfDischarge || null,
        data.etd || null,
        data.eta,
        freeDays,
        data.currency || "USD",
        data.notes || null,
      ]
    );

    const shipmentId = shpRes.rows[0].id;
    const shipmentNo = shpRes.rows[0].shipment_no;

    // Insert lines
    for (const line of data.lines) {
      await client.query(
        `insert into proc.shipment_lines (
          shipment_id, po_line_id, item_id, qty_shipped,
          unit_value_minor, currency, weight_kg, volume_cbm
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          shipmentId,
          line.poLineId || "00000000-0000-0000-0000-000000000000",
          line.itemId,
          line.qtyShipped,
          line.unitValueMinor,
          line.currency || data.currency || "USD",
          line.weightKg || null,
          line.volumeCbm || null,
        ]
      );
    }

    // Insert initial event
    await client.query(
      `insert into proc.shipment_events (
        shipment_id, event_type, location, occurred_at, source, note
      ) values ($1, 'booked', $2, now(), 'manual', 'Shipment created and booked')`,
      [shipmentId, data.portOfLoading || "Origin Port"]
    );

    // Audit log
    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('shipment.create', 'proc.shipments', $1, $2, $3)`,
      [
        shipmentId,
        session.userId,
        JSON.stringify({ shipment_no: shipmentNo, lines_count: data.lines.length }),
      ]
    );

    await client.query("COMMIT");
    revalidatePath("/imports/shipments");
    return { success: true, shipmentId, shipmentNo };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("createShipment error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function updateShipmentStatus(data: {
  shipmentId: string;
  newStatus: string;
  reason?: string;
  location?: string;
  customsEntryNo?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const curRes = await client.query(
      `select id, shipment_no, status, supplier_id from proc.shipments where id = $1 for update`,
      [data.shipmentId]
    );
    if (curRes.rows.length === 0) throw new Error("Shipment not found");
    const shipment = curRes.rows[0];

    const updates: string[] = ["status = $2", "updated_at = now()"];
    const params: any[] = [data.shipmentId, data.newStatus];

    if (data.newStatus === "arrived") {
      updates.push("ata = now()", "free_days_start = current_date");
    }

    await client.query(
      `update proc.shipments set ${updates.join(", ")} where id = $1`,
      params
    );

    // Add milestone event
    await client.query(
      `insert into proc.shipment_events (
        shipment_id, event_type, location, occurred_at, source, note
      ) values ($1, $2, $3, now(), 'user', $4)`,
      [
        data.shipmentId,
        data.newStatus,
        data.location || null,
        data.reason || `Status updated to ${data.newStatus}`,
      ]
    );

    // If starting customs entry
    if (data.newStatus === "customs_processing") {
      const existingEntry = await client.query(
        `select id from proc.customs_entries where shipment_id = $1`,
        [data.shipmentId]
      );
      if (existingEntry.rows.length === 0) {
        await client.query(
          `insert into proc.customs_entries (
            shipment_id, entry_no, status, currency, lodged_on, notes
          ) values (
            $1, coalesce($2, core.next_doc_no('CUS')), 'lodged', 'GHS', current_date, $3
          )`,
          [data.shipmentId, data.customsEntryNo || null, data.reason || null]
        );
      }
    }

    // If customs released / cleared
    if (data.newStatus === "cleared") {
      await client.query(
        `update proc.customs_entries 
         set status = 'released', released_on = current_date, updated_at = now() 
         where shipment_id = $1`,
        [data.shipmentId]
      );
    }

    // When marking delivered per Section 06 workflow:
    // "creates goods receipt draft created for IS with expected lines [N] IS -> /inventory/receipts/[id]"
    if (data.newStatus === "delivered") {
      const locRes = await client.query(
        `select id from core.locations where kind in ('warehouse', 'quarantine', 'receiving') order by code limit 1`
      );
      const defaultLocationId = locRes.rows[0]?.id;

      const grnRes = await client.query(
        `insert into proc.goods_receipts (
          grn_no, supplier_id, status, location_id, received_date, notes
        ) values (
          core.next_doc_no('GRN'), $1, 'draft', $2, current_date, $3
        ) returning id, grn_no`,
        [
          shipment.supplier_id,
          defaultLocationId,
          `Generated from delivered shipment ${shipment.shipment_no}`,
        ]
      );

      const grnId = grnRes.rows[0].id;

      // Copy shipment lines to GRN lines
      const lines = await client.query(
        `select item_id, qty_shipped, po_line_id from proc.shipment_lines where shipment_id = $1`,
        [data.shipmentId]
      );

      let lineNo = 1;
      for (const l of lines.rows) {
        await client.query(
          `insert into proc.goods_receipt_lines (
            grn_id, line_no, item_id, qty_received, qty_accepted, qty_rejected, po_line_id
          ) values ($1, $2, $3, $4, $4, 0, $5)`,
          [grnId, lineNo++, l.item_id, l.qty_shipped, l.po_line_id]
        );
      }
    }

    // Audit log
    await client.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('shipment.status_change', 'proc.shipments', $1, $2, $3)`,
      [
        data.shipmentId,
        session.userId,
        JSON.stringify({ from: shipment.status, to: data.newStatus, reason: data.reason }),
      ]
    );

    await client.query("COMMIT");
    revalidatePath("/imports/shipments");
    revalidatePath(`/imports/shipments/${data.shipmentId}`);
    return { success: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("updateShipmentStatus error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function addShipmentCharge(data: {
  shipmentId: string;
  chargeType: string;
  description?: string;
  partnerId?: string;
  amountMinor: number;
  currency: string;
  fxRate?: number;
  allocationBasis: string;
  isRecoverable?: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const fx = data.fxRate ? Number(data.fxRate) : 1.0;
  const amountBaseMinor = Math.round(data.amountMinor * fx);

  try {
    const res = await db.query(
      `insert into proc.shipment_charges (
        shipment_id, charge_type, description, partner_id, amount_minor,
        currency, fx_rate, amount_base_minor, allocation_basis, is_recoverable,
        status
      ) values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        'estimated'
      ) returning id`,
      [
        data.shipmentId,
        data.chargeType,
        data.description || null,
        data.partnerId || null,
        data.amountMinor,
        data.currency,
        fx,
        amountBaseMinor,
        data.allocationBasis || "value",
        Boolean(data.isRecoverable),
      ]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('shipment.add_charge', 'proc.shipment_charges', $1, $2, $3)`,
      [res.rows[0].id, session.userId, JSON.stringify(data)]
    );

    revalidatePath(`/imports/shipments/${data.shipmentId}`);
    return { success: true };
  } catch (err: any) {
    console.error("addShipmentCharge error:", err);
    return { success: false, error: err.message };
  }
}

export async function markChargeActual(data: {
  chargeId: string;
  shipmentId: string;
  actualMinor: number;
  invoiceRef?: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    const chargeRes = await db.query(
      `select fx_rate from proc.shipment_charges where id = $1`,
      [data.chargeId]
    );
    const fx = Number(chargeRes.rows[0]?.fx_rate || 1.0);
    const amountBaseMinor = Math.round(data.actualMinor * fx);

    await db.query(
      `update proc.shipment_charges
       set amount_minor = $1, amount_base_minor = $2, status = 'actual', 
           invoice_ref = $3, updated_at = now()
       where id = $4`,
      [data.actualMinor, amountBaseMinor, data.invoiceRef || null, data.chargeId]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('shipment.charge_actual', 'proc.shipment_charges', $1, $2, $3)`,
      [data.chargeId, session.userId, JSON.stringify(data)]
    );

    revalidatePath(`/imports/shipments/${data.shipmentId}`);
    return { success: true };
  } catch (err: any) {
    console.error("markChargeActual error:", err);
    return { success: false, error: err.message };
  }
}
