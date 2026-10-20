import { db } from "@/lib/db";
import NewPOClient from "./NewPOClient";
import { Suspense } from "react";
import { requireAnyScope } from "@/lib/session";

export default async function NewPurchaseOrderPageWrapper() {
  await requireAnyScope(["procurement.write"]);

  const suppliersPromise = db.query(
    "SELECT id, name, supplier_no FROM proc.suppliers WHERE status = 'active' ORDER BY name"
  ).then(res => res.rows);

  const itemsPromise = db.query(
    "SELECT id, sku, name, COALESCE(list_price_minor, 0) as standard_cost_minor FROM catalog.items WHERE is_active = true AND is_purchasable = true ORDER BY name"
  ).then(res => res.rows);
  
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading purchase order form...</div>}>
      <NewPOClient suppliersPromise={suppliersPromise} itemsPromise={itemsPromise} />
    </Suspense>
  );
}
