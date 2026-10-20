import { db } from "@/lib/db";
import { Plus, Search, Filter, PackageCheck, Truck, Building2 } from "lucide-react";
import Link from "next/link";
import { requireAnyScope } from "@/lib/session";

import { unstable_cache } from "next/cache";

const getGoodsReceipts = unstable_cache(
  async () => {
    const result = await db.query(`
      select grn.id, grn.grn_no, grn.status, grn.received_at, grn.delivery_note_no,
             s.name as supplier_name,
             l.name as location_name,
             po.po_no
      from proc.goods_receipts grn
      left join proc.suppliers s on s.id = grn.supplier_id
      left join core.locations l on l.id = grn.location_id
      left join proc.purchase_orders po on po.id = grn.po_id
      order by grn.grn_no desc
    `);
    return result.rows;
  },
  ["goods-receipts-list"],
  { tags: ["procurement", "inventory"] }
);

export default async function GoodsReceiptsPage() {
  await requireAnyScope(["inventory.receive", "procurement.write"]);

  const receipts = await getGoodsReceipts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-slate-400" />
            Goods Receipts (GRN)
          </h1>
          <p className="text-sm text-slate-500">Manage incoming inventory receipts from suppliers or shipments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/procurement/grn/new" className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create GRN
          </Link>
        </div>
      </div>

      {/* Procurement Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <Link
          href="/procurement"
          className="pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
        >
          <Truck className="w-4 h-4 text-slate-400" />
          Purchase Orders
        </Link>
        <Link
          href="/procurement/grn"
          className="pb-2.5 border-b-2 border-navy-900 text-navy-900 flex items-center gap-2"
        >
          <PackageCheck className="w-4 h-4 text-navy-900" />
          Goods Receipts
        </Link>
        <Link
          href="/procurement/suppliers"
          className="pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
        >
          <Building2 className="w-4 h-4 text-slate-400" />
          Suppliers Directory
        </Link>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search GRNs by number, supplier or PO..." 
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
                <th className="px-4 py-3 font-medium">GRN Number</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">PO Number</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Received At</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No goods receipts found.
                  </td>
                </tr>
              ) : (
                receipts.map((grn) => (
                  <tr key={grn.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-navy-800">{grn.grn_no}</td>
                    <td className="px-4 py-3 text-ink font-medium">{grn.supplier_name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{grn.po_no || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{grn.location_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {grn.received_at ? new Date(grn.received_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {grn.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/procurement/grn/${grn.id}`} className="text-gold-600 hover:text-gold-700 font-medium">
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
