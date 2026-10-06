import { db } from "@/lib/db";
import NewPOClient from "./NewPOClient";
import { Suspense } from "react";

export default function NewPurchaseOrderPageWrapper() {
  const suppliersPromise = db.query("SELECT id, name FROM core.customer_accounts WHERE is_supplier = true ORDER BY name").then(res => res.rows);
  
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading suppliers...</div>}>
      <NewPOClient suppliersPromise={suppliersPromise} />
    </Suspense>
  );
}
