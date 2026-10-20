import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Send, CheckCircle, Package } from "lucide-react";
import Link from "next/link";
import { requireAnyScope } from "@/lib/session";
import { shipTransferAction, receiveTransferAction, addTransferLineAction } from "./actions";

export default async function TransferDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyScope(["inventory.read"]);
  const { id } = await params;

  const result = await db.query(`
    select t.*,
           from_loc.name as from_location_name,
           to_loc.name as to_location_name
    from inv.transfers t
    join core.locations from_loc on from_loc.id = t.from_location_id
    join core.locations to_loc on to_loc.id = t.to_location_id
    where t.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    notFound();
  }

  const transfer = result.rows[0];

  const linesResult = await db.query(`
    select tl.*, i.sku, i.name as item_name
    from inv.transfer_lines tl
    join catalog.items i on i.id = tl.item_id
    where tl.transfer_id = $1
    order by tl.created_at asc
  `, [id]);
  const lines = linesResult.rows;

  const itemsResult = await db.query(`select id, name, sku from catalog.items order by name`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory/transfers" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-ink tracking-tight flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6 text-slate-400" />
              {transfer.transfer_no}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{transfer.from_location_name}</span>
              <ArrowRightLeft className="w-3 h-3 text-slate-400 mx-1" />
              <span>{transfer.to_location_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
            transfer.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
            transfer.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
            'bg-slate-100 text-slate-800'
          }`}>
            {transfer.status.replace('_', ' ')}
          </span>
          
          {transfer.status === 'draft' && (
            <form action={shipTransferAction}>
              <input type="hidden" name="transfer_id" value={transfer.id} />
              <button
                type="submit"
                disabled={lines.length === 0}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Ship Transfer
              </button>
            </form>
          )}

          {transfer.status === 'in_transit' && (
            <form action={receiveTransferAction}>
              <input type="hidden" name="transfer_id" value={transfer.id} />
              <button
                type="submit"
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Receive Transfer
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-semibold text-ink">Transfer Items</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Item Name</th>
                    <th className="px-4 py-3 font-medium">Lot No</th>
                    <th className="px-4 py-3 font-medium text-right">Qty Expected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                        No items added to this transfer yet.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-navy-800">{line.sku}</td>
                        <td className="px-4 py-3 text-ink font-medium">{line.item_name}</td>
                        <td className="px-4 py-3 text-slate-500">{line.lot_no || "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{Number(line.qty_expected).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {transfer.status === 'draft' && (
            <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden p-6">
              <h3 className="font-medium text-ink mb-4">Add Item</h3>
              <form action={addTransferLineAction} className="space-y-4">
                <input type="hidden" name="transfer_id" value={transfer.id} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="item_id" className="block text-sm font-medium text-slate-700">Item <span className="text-fail">*</span></label>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="qty_expected" className="block text-sm font-medium text-slate-700">Quantity to Transfer <span className="text-fail">*</span></label>
                    <input 
                      type="number" 
                      step="0.0001"
                      min="0"
                      id="qty_expected" 
                      name="qty_expected" 
                      required
                      className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button type="submit" className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Add Line
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-ink border-b border-slate-100 pb-2">Timeline</h3>
            
            <div>
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Created At</span>
              <p className="text-sm text-ink">{new Date(transfer.created_at).toLocaleString()}</p>
            </div>

            {transfer.shipped_at && (
              <div>
                <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Shipped At</span>
                <p className="text-sm text-ink">{new Date(transfer.shipped_at).toLocaleString()}</p>
              </div>
            )}

            {transfer.received_at && (
              <div>
                <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Received At</span>
                <p className="text-sm text-ink">{new Date(transfer.received_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
