import { db } from "@/lib/db";
import { Plus, Search, Filter, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { requireAnyScope } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  await requireAnyScope(["inventory.read", "inventory.issue"]);

  const result = await db.query(`
    select t.id, t.transfer_no, t.status, t.shipped_at, t.received_at,
           from_loc.name as from_location_name,
           to_loc.name as to_location_name
    from inv.transfers t
    join core.locations from_loc on from_loc.id = t.from_location_id
    join core.locations to_loc on to_loc.id = t.to_location_id
    order by t.transfer_no desc
  `);
  const transfers = result.rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-slate-400" />
            Stock Transfers
          </h1>
          <p className="text-sm text-slate-500">Move inventory between locations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/inventory/transfers/new" className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
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
                <th className="px-4 py-3 font-medium">Shipped At</th>
                <th className="px-4 py-3 font-medium">Received At</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No transfers found.
                  </td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-navy-800">{transfer.transfer_no}</td>
                    <td className="px-4 py-3 text-ink font-medium">{transfer.from_location_name}</td>
                    <td className="px-4 py-3 text-ink font-medium">{transfer.to_location_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        transfer.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                        transfer.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {transfer.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {transfer.shipped_at ? new Date(transfer.shipped_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {transfer.received_at ? new Date(transfer.received_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/inventory/transfers/${transfer.id}`} className="text-gold-600 hover:text-gold-700 font-medium">
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
