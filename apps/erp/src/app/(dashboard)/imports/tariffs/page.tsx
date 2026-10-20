import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { TariffsClient, type TariffRow } from "./TariffsClient";

export default async function TariffsPage() {
  await requireAnyScope(["catalog.read", "catalog.write", "imports.write"]);

  const res = await db.query(`
    select 
      id,
      hs_code,
      description,
      duty_pct,
      vat_pct,
      levies,
      effective_from::text as effective_from,
      effective_to::text as effective_to
    from catalog.customs_tariffs
    order by hs_code asc
  `);

  return <TariffsClient initialTariffs={res.rows} />;
}
