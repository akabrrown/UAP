import { db } from "@/lib/db";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

export default async function InventoryPage() {
  const result = await db.query(`
    select t.id, t.transfer_no, t.status, 
           l1.name as from_location, l2.name as to_location
    from inv.transfers t
    left join core.locations l1 on l1.id = t.from_location_id
    left join core.locations l2 on l2.id = t.to_location_id
    order by t.transfer_no desc
  `);
  
  const transfers = result.rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Stock Transfers</h1>
          <p className="text-sm text-slate-500">Manage internal stock movements across locations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/inventory/new" className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Transfer
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search transfers..." 
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
                <th className="px-4 py-3 font-medium">Transfer No</th>
                <th className="px-4 py-3 font-medium">From Location</th>
                <th className="px-4 py-3 font-medium">To Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No transfers found.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-navy-800">{t.transfer_no}</td>
                    <td className="px-4 py-3 text-ink">{t.from_location || "—"}</td>
                    <td className="px-4 py-3 text-ink">{t.to_location || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/inventory/${t.id}`} className="text-gold-600 hover:text-gold-700 font-medium">
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
