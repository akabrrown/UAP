import { db } from "@/lib/db";
import { ArrowLeft, PackageCheck, Save } from "lucide-react";
import Link from "next/link";
import { requireAnyScope } from "@/lib/session";
import { createGrnAction } from "./actions";

export default async function NewGrnPage() {
  await requireAnyScope(["inventory.receive", "procurement.write"]);

  const suppliersResult = await db.query(`select id, name from proc.suppliers order by name`);
  const locationsResult = await db.query(`select id, name from core.locations where kind in ('warehouse', 'quarantine') order by name`);
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/procurement/grn" className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-slate-400" />
            Receive Goods
          </h1>
          <p className="text-sm text-slate-500">Create a new Goods Receipt Note.</p>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <form action={createGrnAction} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="supplier_id" className="block text-sm font-medium text-slate-700">Supplier</label>
              <select 
                id="supplier_id" 
                name="supplier_id" 
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
              >
                <option value="">Select a supplier...</option>
                {suppliersResult.rows.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="location_id" className="block text-sm font-medium text-slate-700">Receiving Location <span className="text-red-500">*</span></label>
              <select 
                id="location_id" 
                name="location_id" 
                required
                className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
              >
                <option value="">Select a location...</option>
                {locationsResult.rows.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="delivery_note_no" className="block text-sm font-medium text-slate-700">Delivery Note / Waybill No.</label>
            <input 
              type="text" 
              id="delivery_note_no" 
              name="delivery_note_no" 
              className="w-full h-10 px-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea 
              id="notes" 
              name="notes" 
              rows={3}
              className="w-full p-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Link href="/procurement/grn" className="h-10 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-[4px] transition-colors flex items-center">
              Cancel
            </Link>
            <button type="submit" className="h-10 px-6 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save & Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
