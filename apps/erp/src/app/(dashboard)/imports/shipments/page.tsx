import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { ShipmentsClient, type ShipmentRow } from "./ShipmentsClient";

export default async function ShipmentsPage() {
  await requireAnyScope(["imports.write", "procurement.write", "inventory.read"]);

  const res = await db.query(`
    select 
      s.id,
      s.shipment_no,
      s.mode,
      s.status,
      s.incoterm,
      s.bl_awb_no,
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
      coalesce(sup.name, 'Multiple / Unspecified') as supplier_name,
      count(distinct sl.id)::int as lines_count,
      count(distinct sc.id)::int as charges_count,
      count(distinct case when sc.status = 'estimated' then sc.id end)::int as estimated_charges_count
    from proc.shipments s
    left join proc.suppliers sup on sup.id = s.supplier_id
    left join proc.shipment_lines sl on sl.shipment_id = s.id
    left join proc.shipment_charges sc on sc.shipment_id = s.id
    group by s.id, sup.name
    order by s.created_at desc
  `);

  const shipments: ShipmentRow[] = res.rows.map((r: any) => {
    let slippageDays = 0;
    if (r.eta && r.original_eta) {
      const etaD = new Date(r.eta).getTime();
      const origD = new Date(r.original_eta).getTime();
      slippageDays = Math.max(0, Math.round((etaD - origD) / (1000 * 60 * 60 * 24)));
    }

    let freeDaysLeft: number | null = null;
    if (r.free_days_start && r.free_days) {
      const startD = new Date(r.free_days_start).getTime();
      const nowD = new Date().getTime();
      const daysPassed = Math.round((nowD - startD) / (1000 * 60 * 60 * 24));
      freeDaysLeft = Math.max(0, Number(r.free_days) - daysPassed);
    }

    return {
      id: r.id,
      shipmentNo: r.shipment_no,
      supplierName: r.supplier_name,
      mode: r.mode,
      status: r.status,
      incoterm: r.incoterm,
      blAwbNo: r.bl_awb_no,
      vesselOrFlight: r.vessel_or_flight,
      portOfLoading: r.port_of_loading,
      portOfDischarge: r.port_of_discharge,
      etd: r.etd,
      eta: r.eta,
      originalEta: r.original_eta,
      ata: r.ata,
      freeDays: r.free_days,
      freeDaysStart: r.free_days_start,
      freeDaysLeft,
      slippageDays,
      currency: r.currency,
      linesCount: Number(r.lines_count || 0),
      chargesCount: Number(r.charges_count || 0),
      estimatedChargesCount: Number(r.estimated_charges_count || 0),
      createdAt: r.created_at,
    };
  });

  return <ShipmentsClient initialShipments={shipments} />;
}
