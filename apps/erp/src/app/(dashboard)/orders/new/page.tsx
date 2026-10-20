import { db } from "@/lib/db";
import NewInternalOrderClient from "./NewInternalOrderClient";
import { Suspense } from "react";
import { requireAnyScope } from "@/lib/session";

export default async function NewInternalOrderPageWrapper() {
  await requireAnyScope(["orders.write"]);
  
  const accountsPromise = db.query(`
    select id, name, account_no, kind
    from core.customer_accounts
    where status = 'active'
    order by name
  `).then(res => res.rows);

  const itemsPromise = db.query(`
    select id, sku, name, coalesce(list_price_minor, 0) as standard_cost_minor
    from catalog.items
    where is_active = true and is_sellable = true
    order by name
  `).then(res => res.rows);
  
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading order creation...</div>}>
      <NewInternalOrderClient accountsPromise={accountsPromise} itemsPromise={itemsPromise} />
    </Suspense>
  );
}
