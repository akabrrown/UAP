import { db } from "@/lib/db";
import NewInvoiceClient from "./NewInvoiceClient";
import { Suspense } from "react";
import { requireAnyScope } from "@/lib/session";

export default async function NewInvoicePageWrapper() {
  await requireAnyScope(["invoices.write"]);
  
  const customersPromise = db.query(`
    select id, name, account_no, kind
    from core.customer_accounts
    where status = 'active'
    order by name
  `).then(res => res.rows);

  const itemsPromise = db.query(`
    select id, sku, name, coalesce(list_price_minor, 0) as standard_cost_minor
    from catalog.items
    where is_active = true
    order by name
  `).then(res => res.rows);
  
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading invoice creation...</div>}>
      <NewInvoiceClient customersPromise={customersPromise} itemsPromise={itemsPromise} />
    </Suspense>
  );
}
