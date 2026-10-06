import { db } from "@/lib/db";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

export default async function CataloguePage() {
  const result = await db.query(`
    select i.id, i.sku, i.name, i.kind, i.uom, i.tracking, i.is_active, 
           c.name as category_name
    from catalog.items i
    left join catalog.categories c on c.id = i.category_id
    order by i.sku asc
  `);
  
  const items = result.rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Catalogue</h1>
          <p className="text-sm text-slate-500">Manage items, bills of materials, and price lists.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Item
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search items by SKU or name..." 
              className="w-full h-9 pl-9 pr-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
            />
          </div>
          <button className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Tracking</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No items found. Import items or create one manually.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-navy-800">{item.sku}</td>
                    <td className="px-4 py-3 text-ink font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{item.kind.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {item.tracking}
                      </span>
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/catalogue/items/${item.id}`} className="text-gold-600 hover:text-gold-700 font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
