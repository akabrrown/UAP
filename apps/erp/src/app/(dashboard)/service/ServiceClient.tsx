"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Headphones, Calendar, AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { deleteServiceTicketAction } from "./actions";

export interface ServiceTicketRow {
  id: string;
  ticket_no: string;
  kind: string;
  status: string;
  priority: string;
  received_at: string;
  customer_name: string | null;
  contact_phone?: string | null;
  device_serial?: string | null;
  device_description?: string | null;
  coverage?: string | null;
  assigned_name?: string | null;
}

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  received: { label: "Received", bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  diagnosing: { label: "Diagnosing", bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  awaiting_approval: { label: "Awaiting Approval", bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  awaiting_parts: { label: "Awaiting Parts", bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  in_repair: { label: "In Repair", bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  testing: { label: "Testing", bg: "bg-teal-100", text: "text-teal-800", dot: "bg-teal-500" },
  ready_for_collection: { label: "Ready for Pickup", bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  closed: { label: "Closed", bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  declined: { label: "Declined", bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
};

const PRIORITY_BADGES: Record<string, { label: string; badge: string }> = {
  urgent: { label: "Urgent", badge: "bg-rose-100 text-rose-800 border-rose-300" },
  high: { label: "High", badge: "bg-orange-100 text-orange-800 border-orange-300" },
  normal: { label: "Normal", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  low: { label: "Low", badge: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

export function ServiceClient({ initialTickets }: { initialTickets: ServiceTicketRow[] }) {
  const [tickets, setTickets] = useState<ServiceTicketRow[]>(initialTickets);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const handleDeleteTicket = (ticket: ServiceTicketRow) => {
    const actionLabel = ticket.status === "received" ? "delete" : "decline";
    if (!confirm(`Are you sure you want to ${actionLabel} ticket ${ticket.ticket_no}?`)) return;

    startTransition(async () => {
      const res = await deleteServiceTicketAction(ticket.id);
      if (res.success) {
        if (res.declined) {
          setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: "declined" } : t)));
        } else {
          setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
        }
      } else {
        alert(res.error || "Failed to delete ticket");
      }
    });
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticket_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.device_serial && t.device_serial.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.device_description && t.device_description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchesKind = kindFilter === "all" || t.kind === kindFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesKind;
  });

  const openCount = tickets.filter((t) => t.status !== "closed" && t.status !== "declined").length;
  const urgentCount = tickets.filter((t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "closed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Service Tickets</h1>
          <p className="text-sm text-slate-500">Manage warranty claims, bench repairs, inspections, and customer equipment.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/service/new"
            className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket #, customer, serial, or device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Statuses ({tickets.length})</option>
              <option value="received">Received</option>
              <option value="diagnosing">Diagnosing</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="awaiting_parts">Awaiting Parts</option>
              <option value="in_repair">In Repair</option>
              <option value="testing">Testing</option>
              <option value="ready_for_collection">Ready for Pickup</option>
              <option value="closed">Closed</option>
              <option value="declined">Declined</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none capitalize"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>

            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none capitalize"
            >
              <option value="all">All Ticket Kinds</option>
              <option value="warranty_claim">Warranty Claim</option>
              <option value="paid_repair">Paid Repair</option>
              <option value="inspection">Inspection</option>
              <option value="complaint">Complaint</option>
              <option value="preventive">Preventive</option>
            </select>
          </div>
        </div>

        {/* Quick summary ribbon */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong className="text-navy-900 font-semibold">{filteredTickets.length}</strong> of {tickets.length} tickets
          </span>
          <div className="flex items-center gap-4">
            <span>
              Active Open: <strong className="text-navy-900 font-semibold">{openCount}</strong>
            </span>
            {urgentCount > 0 && (
              <span className="flex items-center gap-1 text-rose-700 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 inline" />
                {urgentCount} High/Urgent
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Ticket Number</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Customer / Device</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Kind & Coverage</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Priority</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px]">Received At</th>
                <th className="px-4 py-3 uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Headphones className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No service tickets found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const badge = STATUS_BADGES[t.status] || {
                    label: t.status.replace(/_/g, " "),
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    dot: "bg-slate-400",
                  };
                  const prio = PRIORITY_BADGES[t.priority] || {
                    label: t.priority,
                    badge: "bg-slate-100 text-slate-700 border-slate-300",
                  };

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-navy-900">{t.ticket_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{t.customer_name || "N/A"}</div>
                        {(t.device_description || t.device_serial) && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {t.device_description}
                            {t.device_serial && <span className="font-mono text-slate-400 ml-1">[{t.device_serial}]</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="capitalize font-medium text-slate-700">{t.kind.replace("_", " ")}</div>
                        {t.coverage && (
                          <div className="text-[10px] text-slate-500 capitalize flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3 text-slate-400 inline" />
                            {t.coverage.replace("_", " ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border capitalize ${prio.badge}`}>
                          {prio.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${badge.bg} ${badge.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 inline" />
                          {new Date(t.received_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/service/${t.id}`}
                            className="text-gold-600 hover:text-gold-700 font-semibold"
                          >
                            View Ticket
                          </Link>
                          {t.status !== "closed" && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDeleteTicket(t)}
                              className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                              title={t.status === "received" ? "Delete Ticket" : "Decline Ticket"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
