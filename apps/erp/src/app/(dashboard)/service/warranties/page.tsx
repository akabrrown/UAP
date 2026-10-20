import { Metadata } from "next";
import { getSession, requireAnyScope } from "@/lib/session";
import { db } from "@/lib/db";
import { WarrantiesClient, WarrantyRow } from "./WarrantiesClient";

export const metadata: Metadata = {
  title: "Warranty Register & Lookup | Service & Warranty | UAP",
};

export default async function ServiceWarrantiesPage() {
  await requireAnyScope(["warranty.read", "service.write", "service.work"]);
  const session = await getSession();

  const warrantiesRes = await db.query(`
    select 
      w.id,
      w.unit_id,
      u.internal_ref as unit_ref,
      u.serial_no,
      i.name as model_name,
      i.sku,
      w.account_id,
      ca.name as account_name,
      ca.contact_name,
      ca.contact_phone,
      w.starts_on::text as starts_on,
      w.ends_on::text as ends_on,
      w.months,
      w.status,
      coalesce(st_count.count, 0) as claims_count,
      coalesce(
        json_agg(
          json_build_object(
            'item_name', coalesce(comp_i.name, 'Component'),
            'serial_no', cs.serial_no,
            'supplier_name', sup.name,
            'supplier_warranty_months', 12
          )
        ) filter (where cs.id is not null), '[]'::json
      ) as components
    from svc.warranties w
    join prod.units u on u.id = w.unit_id
    join catalog.items i on i.id = u.item_id
    left join core.customer_accounts ca on ca.id = w.account_id
    left join (
      select unit_id, count(*)::int as count 
      from svc.service_tickets 
      group by unit_id
    ) st_count on st_count.unit_id = w.unit_id
    left join prod.unit_components uc on uc.unit_id = u.id and uc.removed_at is null
    left join inv.component_serials cs on cs.id = uc.component_serial_id
    left join catalog.items comp_i on comp_i.id = uc.item_id
    left join proc.goods_receipt_lines grl on grl.id = cs.grn_line_id
    left join proc.goods_receipts gr on gr.id = grl.grn_id
    left join proc.suppliers sup on sup.id = gr.supplier_id
    group by w.id, u.internal_ref, u.serial_no, i.name, i.sku, ca.name, ca.contact_name, ca.contact_phone, st_count.count
    order by w.ends_on desc
    limit 150
  `);

  const warranties: WarrantyRow[] = warrantiesRes.rows.map((row) => ({
    id: row.id,
    unit_id: row.unit_id,
    unit_ref: row.unit_ref,
    serial_no: row.serial_no,
    model_name: row.model_name,
    sku: row.sku,
    account_id: row.account_id,
    account_name: row.account_name,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    starts_on: row.starts_on,
    ends_on: row.ends_on,
    months: Number(row.months),
    status: row.status as WarrantyRow["status"],
    claims_count: Number(row.claims_count),
    components: Array.isArray(row.components) ? row.components : [],
  }));

  const userRole = session?.role || "assembly_technician";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f4b41a] uppercase tracking-wider">
            Service & Support
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Warranty Register & Device Lookup</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trace device warranty coverage, customer assignments, claims history, and component supplier terms. (Section 11 Workflow)
          </p>
        </div>
      </div>

      <WarrantiesClient warranties={warranties} userRole={userRole} />
    </div>
  );
}
