import { db } from "@/lib/db";
import { Search, Filter, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default async function ApprovalsPage() {
  const result = await db.query(`
    select a.id, a.subject_type, a.status, a.amount_minor, a.currency, a.created_at,
           req.full_name as requested_by_name
    from core.approvals a
    join core.profiles req on req.id = a.requested_by
    order by a.created_at desc
    limit 50
  `);
  
  const approvals = result.rows;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Pending Approvals</h1>
        <p className="text-sm text-slate-500">Review and authorize pending requests across modules.</p>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search approvals..." 
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
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Requested By</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No pending approvals. You're all caught up!
                  </td>
                </tr>
              ) : (
                approvals.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3 text-ink font-medium capitalize">
                      {a.subject_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.requested_by_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {a.amount_minor ? `${a.currency} ${(a.amount_minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        a.status === 'pending' ? 'bg-gold-50 text-gold-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 hover:bg-slate-200 rounded text-fail transition-colors" title="Reject">
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button className="p-1 hover:bg-slate-200 rounded text-success transition-colors" title="Approve">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <Link href={`/approvals/${a.id}`} className="text-gold-600 hover:text-gold-700 font-medium">
                          View
                        </Link>
                      )}
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
