import { db } from "@/lib/db";
import { ArrowLeft, Plus, Box, Layers, Settings } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateBomLineForm } from "./bom-form";
import { CategorySelector } from "./CategorySelector";
import { ItemActions } from "./ItemActions";
import { DeleteBomLineButton } from "./DeleteBomLineButton";
import { requireAnyScope } from "@/lib/session";

export default async function ItemDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyScope(["catalog.read"]);
  const { id } = await params;

  // Fetch item details
  const itemResult = await db.query(
    `
    select i.*, c.name as category_name
    from catalog.items i
    left join catalog.categories c on c.id = i.category_id
    where i.id = $1
    `,
    [id]
  );

  const item = itemResult.rows[0];
  if (!item) {
    notFound();
  }

  // Fetch active or latest BOM for this item
  const bomResult = await db.query(
    `
    select id, version, status, effective_from, labour_minutes
    from catalog.boms
    where item_id = $1
    order by version desc
    limit 1
    `,
    [id]
  );
  const bom = bomResult.rows[0];

  let bomLines: any[] = [];
  if (bom) {
    const linesResult = await db.query(
      `
      select bl.*, i.sku, i.name, i.uom 
      from catalog.bom_lines bl
      join catalog.items i on i.id = bl.component_item_id
      where bl.bom_id = $1
      order by i.name asc
      `,
      [bom.id]
    );
    bomLines = linesResult.rows;
  }

  // Fetch all items for component selection
  const allItemsResult = await db.query(`
    select id, sku, name, uom from catalog.items where id != $1 order by name asc
  `, [id]);
  const allItems = allItemsResult.rows;

  // Fetch all categories for category assignment
  const categoriesResult = await db.query(`
    select id, name from catalog.categories order by name asc
  `);
  const allCategories = categoriesResult.rows;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/catalogue"
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink tracking-tight">
                {item.name}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 font-mono">
                {item.sku}
              </span>
            </div>
            <p className="text-sm text-slate-500 capitalize">
              {item.kind.replace("_", " ")} &middot; {item.category_name || "Uncategorized"}
            </p>
          </div>
        </div>

        <ItemActions item={item} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
              <Box className="w-4 h-4 text-slate-400" />
              Item Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status</p>
                {item.is_active ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-pass-bg text-pass border border-pass/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-pass" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Inactive
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Category</p>
                <CategorySelector
                  itemId={item.id}
                  currentCategoryId={item.category_id}
                  currentCategoryName={item.category_name}
                  categories={allCategories}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-slate-700">{item.description || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Base UOM</p>
                  <p className="text-sm text-slate-700 capitalize">{item.uom}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Tracking</p>
                  <p className="text-sm text-slate-700 capitalize">{item.tracking}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                Bill of Materials (BOM)
              </h3>
              {bom && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-navy-50 text-navy-700 border border-navy-200">
                    Version {bom.version}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                    {bom.status.replace("_", " ")}
                  </span>
                </div>
              )}
            </div>

            <div className="p-5">
              {!bom ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500 mb-4">No Bill of Materials exists for this item.</p>
                  <form action={async () => {
                    "use server";
                    const { db } = await import("@/lib/db");
                    const { revalidatePath } = await import("next/cache");
                    await db.query(
                      "insert into catalog.boms (item_id, version, status) values ($1, 1, 'draft')",
                      [id]
                    );
                    revalidatePath(`/catalogue/items/${id}`);
                  }}>
                    <button type="submit" className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors">
                      Create BOM v1
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* BOM Info */}
                  <div className="flex items-center gap-6 pb-4 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Labour Minutes</p>
                      <p className="text-sm text-slate-700">{bom.labour_minutes} mins</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Effective From</p>
                      <p className="text-sm text-slate-700">
                        {bom.effective_from ? new Date(bom.effective_from).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Lines */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Components</h4>
                    {bomLines.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-300 rounded-[4px] text-sm text-slate-500">
                        No components added to this BOM yet.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-[4px] overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2.5 font-medium">Component</th>
                              <th className="px-4 py-2.5 font-medium">SKU</th>
                              <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                              <th className="px-4 py-2.5 font-medium">UOM</th>
                              <th className="px-4 py-2.5 font-medium text-right">Scrap %</th>
                              {bom.status === "draft" && (
                                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bomLines.map(line => (
                              <tr key={line.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 text-ink font-medium">{line.name}</td>
                                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{line.sku}</td>
                                <td className="px-4 py-2.5 text-right font-medium">{Number(line.qty).toString()}</td>
                                <td className="px-4 py-2.5 text-slate-600 capitalize">{line.uom}</td>
                                <td className="px-4 py-2.5 text-right text-slate-600">{Number(line.scrap_pct).toString()}%</td>
                                {bom.status === "draft" && (
                                  <td className="px-4 py-2.5 text-right">
                                    <DeleteBomLineButton
                                      lineId={line.id}
                                      itemId={id}
                                      componentName={line.name}
                                    />
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {bom.status === "draft" && (
                    <CreateBomLineForm bomId={bom.id} itemId={id} allItems={allItems} />
                  )}

                  {bom.status === "draft" && (
                    <div className="pt-4 flex justify-end">
                      <form action={async () => {
                        "use server";
                        const { db } = await import("@/lib/db");
                        const { revalidatePath } = await import("next/cache");
                        await db.query(
                          "update catalog.boms set status = 'active' where id = $1",
                          [bom.id]
                        );
                        revalidatePath(`/catalogue/items/${id}`);
                      }}>
                        <button type="submit" className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors">
                          Publish BOM
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
