import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Phone, Mail, Laptop, Wrench, Clock, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { requireAnyScope } from "@/lib/session";
import { ServiceTicketActions } from "./ServiceTicketActions";

export default async function ServiceTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyScope(["service.write", "service.work", "warranty.read"]);
  const { id } = await params;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) {
    notFound();
  }

  const ticketRes = await db.query(
    `select st.*, 
            ca.name as account_name,
            p.full_name as technician_name
     from svc.service_tickets st
     left join core.customer_accounts ca on ca.id = st.account_id
     left join core.profiles p on p.id = st.assigned_to
     where st.id = $1`,
    [id]
  );

  const ticket = ticketRes.rows[0];
  if (!ticket) {
    notFound();
  }

  const [partsRes, eventsRes] = await Promise.all([
    db.query(
      `select sp.*, i.name as item_name, i.sku as item_sku
       from svc.service_parts sp
       join catalog.items i on i.id = sp.item_id
       where sp.ticket_id = $1
       order by sp.created_at asc`,
      [id]
    ),
    db.query(
      `select se.*
       from svc.service_events se
       where se.ticket_id = $1
       order by se.created_at desc`,
      [id]
    )
  ]);

  const parts = partsRes.rows;
  const events = eventsRes.rows;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/service"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Service Tickets
        </Link>
        <div className="flex items-center gap-3">
          <ServiceTicketActions
            ticketId={ticket.id}
            ticketNo={ticket.ticket_no}
            status={ticket.status}
            priority={ticket.priority}
            contactName={ticket.contact_name}
            contactPhone={ticket.contact_phone}
            contactEmail={ticket.contact_email}
            faultDescription={ticket.fault_description}
            diagnosis={ticket.diagnosis}
            resolution={ticket.resolution}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-medium text-slate-500 px-2.5 py-0.5 rounded bg-slate-100">
              {ticket.kind.replace(/_/g, " ")}
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                ticket.status === "closed"
                  ? "bg-pass-bg text-pass"
                  : ticket.status === "ready_for_collection" || ticket.status === "in_repair"
                  ? "bg-navy-50 text-navy-800"
                  : ticket.status === "declined"
                  ? "bg-fail-bg text-fail"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {ticket.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink font-mono">{ticket.ticket_no}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Received {new Date(ticket.received_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium capitalize ${
                ticket.priority === "urgent" || ticket.priority === "high"
                  ? "bg-fail-bg text-fail"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Priority: {ticket.priority}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
              Coverage: {ticket.coverage.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Customer Contact</p>
              <p className="text-sm font-semibold text-ink">
                {ticket.contact_name || ticket.account_name || "Unknown"}
              </p>
              {ticket.contact_phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" /> {ticket.contact_phone}
                </p>
              )}
              {ticket.contact_email && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-slate-400" /> {ticket.contact_email}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Laptop className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Device Description</p>
              <p className="text-sm font-medium text-ink">
                {ticket.device_description || "Computer Hardware"}
              </p>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Serial: {ticket.device_serial || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Assigned Technician</p>
              <p className="text-sm font-medium text-ink">
                {ticket.technician_name || "Unassigned bench"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Labour: {ticket.labour_minutes} minutes
              </p>
            </div>
          </div>
        </div>

        {/* Diagnosis & Fault Details */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Customer Reported Fault
            </h3>
            <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded border border-slate-200">
              {ticket.fault_description || "No description provided."}
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Technical Diagnosis & Resolution
            </h3>
            <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded border border-slate-200">
              {ticket.diagnosis || ticket.resolution || "Bench inspection pending."}
            </p>
          </div>
        </div>

        {/* Parts used */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-500" />
            Replacement Parts & Consumables
          </h2>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Item Description</th>
                  <th className="px-4 py-3 font-medium text-right">Quantity</th>
                  <th className="px-4 py-3 font-medium">Covered Under</th>
                  <th className="px-4 py-3 font-medium text-right">Customer Charge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No repair components consumed on this ticket.
                    </td>
                  </tr>
                ) : (
                  parts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-navy-800">{p.item_sku}</td>
                      <td className="px-4 py-3 font-medium text-ink">{p.item_name}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink tabular-nums">
                        {Number(p.qty).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-slate-600">
                        {p.covered_by.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        GHS {(Number(p.unit_price_minor) / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timeline Events */}
        <div className="p-6">
          <h2 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Service History & Log
          </h2>

          {events.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No events logged yet.</p>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 text-sm p-3 bg-slate-50 rounded border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-navy-800 mt-2 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink text-xs uppercase">{ev.event_type}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                    {ev.note && <p className="text-xs text-slate-600 mt-1">{ev.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
