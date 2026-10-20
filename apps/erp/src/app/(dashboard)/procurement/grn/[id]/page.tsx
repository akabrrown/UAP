import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle, PackageCheck, AlertCircle, Plus } from "lucide-react";
import Link from "next/link";
import { requireAnyScope } from "@/lib/session";
import { postGrnAction, addGrnLineAction } from "./actions";

export default async function GrnDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyScope(["inventory.receive", "procurement.write"]);

  const { id } = await params;

  const result = await db.query(`
    select grn.*, 
           s.name as supplier_name,
           l.name as location_name,
           u.name as receiver_name
    from proc.goods_receipts grn
    left join proc.suppliers s on s.id = grn.supplier_id
    left join core.locations l on l.id = grn.location_id
    left join core.profiles u on u.id = grn.received_by
    where grn.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    notFound();
  }

  const grn = result.rows[0];

  const linesResult = await db.query(`
    select grl.*, i.sku, i.name as item_name
    from proc.goods_receipt_lines grl
    join catalog.items i on i.id = grl.item_id
    where grl.grn_id = $1
    order by grl.created_at asc
  `, [id]);

  const lines = linesResult.rows;

  const itemsResult = await db.query(`select id, name, sku from catalog.items order by name`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/procurement/grn" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-ink tracking-tight flex items-center gap-2">
              <PackageCheck className="w-6 h-6 text-slate-400" />
              {grn.grn_no}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{grn.supplier_name || "Internal"}</span>
              <span>•</span>
              <span>{grn.location_name}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
            grn.status === 'posted' ? 'bg-emerald-100 text-emerald-800' : 
            grn.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 
            'bg-amber-100 text-amber-800'
          }`}>
            {grn.status}
          </span>
          {grn.status === 'draft' && (
            <form action={postGrnAction}>
              <input type="hidden" name="grn_id" value={grn.id} />
              <button 
                type="submit"
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2 disabled:opacity-50"
                disabled={lines.length === 0}
              >
                <CheckCircle className="w-4 h-4" />
                Post Receipt
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-semibold text-ink">Received Items</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Item Name</th>
                    <th className="px-4 py-3 font-medium">Lot No</th>
                    <th className="px-4 py-3 font-medium text-right">Received</th>
                    <th className="px-4 py-3 font-medium text-right">Accepted</th>
                    <th className="px-4 py-3 font-medium text-right">Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        No items added to this receipt yet.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-navy-800">{line.sku}</td>
                        <td className="px-4 py-3 text-ink font-medium">{line.item_name}</td>
                        <td className="px-4 py-3 text-slate-500">{line.lot_no || "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{Number(line.qty_received).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">{Number(line.qty_accepted).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-rose-600">{Number(line.qty_rejected).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {grn.status === 'draft' && (
            <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden p-6">
              <h3 className="font-medium text-ink mb-4">Add Item</h3>
              <form action={addGrnLineAction} className="space-y-4">
                <input type="hidden" name="grn_id" value={grn.id} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="item_id" className="block text-sm font-medium text-slate-700">Item <span className="text-red-500">*</span></label>
                    <select 
                      id="item_id" 
                      name="item_id" 
                      required
                      className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                    >
                      <option value="">Select an item...</option>
                      {itemsResult.rows.map(item => (
                        <option key={item.id} value={item.id}>{item.sku} - {item.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lot_no" className="block text-sm font-medium text-slate-700">Lot Number</label>
                    <input 
                      type="text" 
                      id="lot_no" 
                      name="lot_no" 
                      className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="qty_received" className="block text-sm font-medium text-slate-700">Received <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      id="qty_received" 
                      name="qty_received" 
                      required
                      className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="qty_accepted" className="block text-sm font-medium text-slate-700">Accepted <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      id="qty_accepted" 
                      name="qty_accepted" 
                      required
                      className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="qty_rejected" className="block text-sm font-medium text-slate-700">Rejected</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      defaultValue="0"
                      id="qty_rejected" 
                      name="qty_rejected" 
                      className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button type="submit" className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Line
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-ink border-b border-slate-100 pb-2">Receipt Details</h3>
            
            <div>
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Waybill / Delivery Note</span>
              <p className="text-sm text-ink">{grn.delivery_note_no || "—"}</p>
            </div>
            
            <div>
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Received By</span>
              <p className="text-sm text-ink">{grn.receiver_name}</p>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Received At</span>
              <p className="text-sm text-ink">
                {grn.received_at ? new Date(grn.received_at).toLocaleString() : "—"}
              </p>
            </div>

            {grn.posted_at && (
              <div>
                <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Posted At</span>
                <p className="text-sm text-ink">
                  {new Date(grn.posted_at).toLocaleString()}
                </p>
              </div>
            )}

            {grn.notes && (
              <div>
                <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notes</span>
                <p className="text-sm text-ink whitespace-pre-wrap">{grn.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
