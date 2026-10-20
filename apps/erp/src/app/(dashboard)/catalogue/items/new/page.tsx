import { db } from "@/lib/db";
import NewItemClient from "./NewItemClient";
import { Suspense } from "react";
import { requireAnyScope } from "@/lib/session";

export default async function NewItemPageWrapper() {
  await requireAnyScope(["catalog.write"]);
  
  const categoriesPromise = db.query("SELECT id, name FROM catalog.categories ORDER BY name").then(res => res.rows);
  
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading item creation...</div>}>
      <NewItemClient categoriesPromise={categoriesPromise} />
    </Suspense>
  );
}
