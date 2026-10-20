import { db } from "@/lib/db";
import NewTransferClient from "./NewTransferClient";
import { Suspense } from "react";

import { requireAnyScope } from "@/lib/session";

export default async function NewTransferPageWrapper() {
  await requireAnyScope(["inventory.receive", "inventory.issue"]);

  const locationsPromise = db.query("SELECT id, name FROM core.locations WHERE active = true ORDER BY name").then(res => res.rows);
  
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading locations...</div>}>
      <NewTransferClient locationsPromise={locationsPromise} />
    </Suspense>
  );
}
