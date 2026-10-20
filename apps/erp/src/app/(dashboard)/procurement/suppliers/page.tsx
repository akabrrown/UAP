import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { SuppliersClient, SupplierRow } from "./SuppliersClient";

export default async function SuppliersPage() {
  await requireAnyScope(["suppliers.write", "procurement.write", "catalog.read"]);

  const result = await db.query<SupplierRow>(`
    select 
      s.id,
      s.supplier_no,
      s.name,
      s.country,
      s.kind,
      s.tin,
      s.contact_name,
      s.email::text as email,
      s.phone,
      s.currency,
      s.payment_terms,
      s.lead_time_days,
      s.status,
      count(po.id)::int as po_count
    from proc.suppliers s
    left join proc.purchase_orders po on po.supplier_id = s.id
    group by s.id
    order by s.created_at desc, s.name asc
  `);

  return <SuppliersClient initialSuppliers={result.rows} />;
}
