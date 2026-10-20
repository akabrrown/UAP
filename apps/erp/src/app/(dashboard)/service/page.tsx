import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { ServiceClient, ServiceTicketRow } from "./ServiceClient";

export default async function ServicePage() {
  await requireAnyScope(["service.write", "service.work", "warranty.read"]);

  const result = await db.query<ServiceTicketRow>(`
    select 
      st.id, 
      st.ticket_no, 
      st.kind, 
      st.status, 
      st.priority, 
      st.received_at::text as received_at,
      coalesce(ca.name, st.contact_name) as customer_name,
      st.contact_phone,
      st.device_serial,
      st.device_description,
      st.coverage,
      p.full_name as assigned_name
    from svc.service_tickets st
    left join core.customer_accounts ca on ca.id = st.account_id
    left join core.profiles p on p.id = st.assigned_to
    order by st.received_at desc
    limit 100
  `);

  return <ServiceClient initialTickets={result.rows} />;
}
