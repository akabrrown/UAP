import { db } from "@/lib/db";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

export default async function ServicePage() {
  const result = await db.query(`
    select st.id, st.ticket_no, st.kind, st.status, st.priority, st.received_at,
           coalesce(ca.name, st.contact_name) as customer_name
    from svc.service_tickets st
    left join core.customer_accounts ca on ca.id = st.account_id
    order by st.received_at desc
    limit 50
  `);
  
  const tickets = result.rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Service Tickets</h1>
          <p className="text-sm text-slate-500">Manage warranty claims, repairs, and inspections.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/service/new" className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Ticket
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              className="w-full h-9 pl-9 pr-3 rounded-[4px] border border-slate-300 focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none transition-colors text-sm"
            />
          </div>
          <button className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Ticket Number</th>
                <th className="px-4 py-3 font-medium">Customer / Contact</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Received At</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No service tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-navy-800">{t.ticket_no}</td>
                    <td className="px-4 py-3 text-ink font-medium">{t.customer_name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {t.kind.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        t.priority === 'urgent' || t.priority === 'high' ? 'bg-fail-bg text-fail' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(t.received_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/service/${t.id}`} className="text-gold-600 hover:text-gold-700 font-medium">
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
