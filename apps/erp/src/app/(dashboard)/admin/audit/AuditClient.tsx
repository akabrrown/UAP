"use client";

import { useState } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Filter,
  Download,
  Eye,
  X,
  User,
  Clock,
  Globe,
  Layers,
  ArrowRight,
  Code2
} from "lucide-react";

export interface AuditLogRow {
  id: string;
  at: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  actor_name: string;
  actor_email: string | null;
  ip: string | null;
  request_id: string | null;
  device: string | null;
  before: any | null;
  after: any | null;
}

const ACTION_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  CREATE_ITEM: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  CREATE_TRANSFER: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  CREATE_GRN: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  CREATE_TICKET: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  RELEASE_AO: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  INVITE_USER: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  UPDATE_ROLE: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  UPDATE_STATUS: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  INSERT: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  UPDATE: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  DELETE: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export function AuditClient({ initialLogs }: { initialLogs: AuditLogRow[] }) {
  const [logs] = useState<AuditLogRow[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const uniqueEntities = Array.from(new Set(logs.map((l) => l.entity_type))).sort();

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.actor_email && l.actor_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.ip && l.ip.includes(searchQuery));

    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    const matchesEntity = entityFilter === "all" || l.entity_type === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const rows = [
      ["Audit ID", "Timestamp", "Actor Name", "Actor Email", "Action", "Entity Type", "Entity ID", "IP Address", "Device"],
      ...filteredLogs.map((l) => [
        l.id,
        l.at,
        l.actor_name,
        l.actor_email || "",
        l.action,
        l.entity_type,
        l.entity_id || "",
        l.ip || "",
        l.device || "",
      ]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `techcore-audit-log-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink tracking-tight">System Audit Trail</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-navy-50 text-navy-800 border border-navy-200">
              Append-Only Ledger
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Immutable system-wide ledger tracking user mutations, role privileges, and transactional events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded flex items-center gap-2 transition-colors"
          >
            User Administration
          </Link>
          <button
            onClick={handleExportCSV}
            className="h-9 px-3.5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export Log CSV
          </button>
        </div>
      </div>

      {/* Admin Section Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <Link
          href="/admin"
          className="pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
        >
          <User className="w-4 h-4 text-slate-400" />
          User Identities & Access
        </Link>
        <Link
          href="/admin/audit"
          className="pb-2.5 border-b-2 border-navy-900 text-navy-900 flex items-center gap-2"
        >
          <History className="w-4 h-4 text-navy-900" />
          Audit Trail & Security Logs
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by actor, action, entity type, ID, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Actions ({uniqueActions.length})</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Entities ({uniqueEntities.length})</option>
              {uniqueEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Metrics Ribbon */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong className="text-navy-900 font-semibold">{filteredLogs.length}</strong> of {logs.length} audit entries
          </span>
          <span className="text-[11px] text-slate-500">
            Partitioned by date · Non-repudiable transaction records
          </span>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Timestamp</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Actor</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Action</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Entity Scope</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Origin</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px] text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No audit records match the selected search criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = ACTION_BADGES[log.action] || {
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    border: "border-slate-200",
                  };
                  const dateObj = new Date(log.at);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Timestamp */}
                      <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                        <div>{dateObj.toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {log.actor_name}
                        </div>
                        {log.actor_email && (
                          <div className="text-[10px] text-slate-500 font-mono ml-5">
                            {log.actor_email}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Entity Scope */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {log.entity_type}
                        </div>
                        {log.entity_id && (
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px] ml-4.5" title={log.entity_id}>
                            #{log.entity_id}
                          </div>
                        )}
                      </td>

                      {/* Origin */}
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {log.ip ? (
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-400 inline" />
                            <span className="font-mono text-[10px]">{log.ip}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Internal</span>
                        )}
                      </td>

                      {/* Payload Inspector Button */}
                      <td className="px-4 py-3 text-right">
                        {(log.before || log.after) ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gold-700 bg-gold-50 hover:bg-gold-100 rounded border border-gold-200 transition-colors"
                          >
                            <Code2 className="w-3 h-3" />
                            View State
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-navy-900" />
                <h3 className="text-sm font-semibold text-ink">
                  Audit Snapshot #{selectedLog.id} · <span className="font-mono text-navy-800">{selectedLog.action}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Actor</span>
                  <span className="font-medium text-ink">{selectedLog.actor_name}</span>
                  {selectedLog.actor_email && <span className="text-slate-500 block text-[11px]">{selectedLog.actor_email}</span>}
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Entity</span>
                  <span className="font-medium text-ink">{selectedLog.entity_type}</span>
                  {selectedLog.entity_id && <span className="text-slate-500 font-mono block text-[11px]">ID: {selectedLog.entity_id}</span>}
                </div>
              </div>

              {selectedLog.before && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    State Before Mutation
                  </h4>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    State After Mutation
                  </h4>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded transition-colors"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
