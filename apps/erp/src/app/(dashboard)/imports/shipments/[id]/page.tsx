import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ShipmentDetailClient } from "./ShipmentDetailClient";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const [shipmentRes, linesRes, customsRes, chargesRes, eventsRes, auditRes] = await Promise.all([
    db.query(`
      select 
        s.id,
        s.shipment_no,
        s.mode,
        s.status,
        s.incoterm,
        s.bl_awb_no,
        s.container_nos,
        s.vessel_or_flight,
        s.port_of_loading,
        s.port_of_discharge,
        s.etd::text as etd,
        s.eta::text as eta,
        s.original_eta::text as original_eta,
        s.ata::text as ata,
        s.free_days,
        s.free_days_start::text as free_days_start,
        s.currency,
        s.notes,
        s.created_at::text as created_at,
        coalesce(sup.name, 'Unspecified Supplier') as supplier_name,
        sup.country as supplier_country
      from proc.shipments s
      left join proc.suppliers sup on sup.id = s.supplier_id
      where s.id = $1
    `, [id]),

    db.query(`
      select 
        sl.id,
        sl.item_id,
        sl.qty_shipped,
        sl.unit_value_minor,
        sl.currency,
        sl.weight_kg,
        sl.volume_cbm,
        i.sku,
        i.name as item_name,
        i.hs_code,
        po.po_no
      from proc.shipment_lines sl
      join catalog.items i on i.id = sl.item_id
      left join proc.purchase_order_lines pol on pol.id = sl.po_line_id
      left join proc.purchase_orders po on po.id = pol.po_id
      where sl.shipment_id = $1
      order by sl.created_at asc
    `, [id]),

    db.query(`
      select 
        id,
        entry_no,
        regime,
        status,
        customs_value_minor,
        duty_minor,
        vat_minor,
        levies_minor,
        total_payable_minor,
        currency,
        inspection_lane,
        lodged_on::text as lodged_on,
        assessed_on::text as assessed_on,
        paid_on::text as paid_on,
        released_on::text as released_on,
        notes
      from proc.customs_entries
      where shipment_id = $1
      order by created_at desc
      limit 1
    `, [id]),

    db.query(`
      select 
        id,
        charge_type,
        description,
        amount_minor,
        currency,
        fx_rate,
        amount_base_minor,
        allocation_basis,
        is_recoverable,
        status,
        invoice_ref,
        incurred_on::text as incurred_on
      from proc.shipment_charges
      where shipment_id = $1
      order by created_at asc
    `, [id]),

    db.query(`
      select 
        id,
        event_type,
        location,
        occurred_at::text as occurred_at,
        source,
        note
      from proc.shipment_events
      where shipment_id = $1
      order by occurred_at desc
    `, [id]),

    db.query(`
      select 
        al.id,
        al.action,
        al.at::text as created_at,
        coalesce(p.full_name, 'System') as actor_name,
        al.after as new_data
      from core.audit_log al
      left join core.profiles p on p.id = al.actor_id
      where al.entity_id = $1
      order by al.at desc
      limit 20
    `, [id]),
  ]);

  if (shipmentRes.rows.length === 0) {
    notFound();
  }

  const s = shipmentRes.rows[0];

  let slippageDays = 0;
  if (s.eta && s.original_eta) {
    const etaD = new Date(s.eta).getTime();
    const origD = new Date(s.original_eta).getTime();
    slippageDays = Math.max(0, Math.round((etaD - origD) / (1000 * 60 * 60 * 24)));
  }

  let freeDaysLeft: number | null = null;
  if (s.free_days_start && s.free_days) {
    const startD = new Date(s.free_days_start).getTime();
    const nowD = new Date().getTime();
    const daysPassed = Math.round((nowD - startD) / (1000 * 60 * 60 * 24));
    freeDaysLeft = Math.max(0, Number(s.free_days) - daysPassed);
  }

  return (
    <ShipmentDetailClient
      shipment={{
        ...s,
        container_nos: s.container_nos || [],
        slippageDays,
        freeDaysLeft,
      }}
      lines={linesRes.rows}
      customsEntry={customsRes.rows[0] || null}
      charges={chargesRes.rows}
      events={eventsRes.rows}
      auditEntries={auditRes.rows}
      userScopes={session?.scopes ? Array.from(session.scopes) : []}
    />
  );
}
