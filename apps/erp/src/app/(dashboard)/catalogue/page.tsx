import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { CatalogueClient } from "./CatalogueClient";

export default async function CataloguePage() {
  await requireAnyScope(["catalog.read"]);

  const result = await db.query(`
    select i.id, i.sku, i.name, i.kind, i.uom, i.tracking, i.is_active, 
           c.name as category_name
    from catalog.items i
    left join catalog.categories c on c.id = i.category_id
    order by i.sku asc
  `);

  return <CatalogueClient initialItems={result.rows} />;
}
