import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { AuditClient, AuditLogRow } from "./AuditClient";

export default async function AuditTrailPage() {
  await requireAnyScope(["audit.read", "users.manage"]);

  const result = await db.query<AuditLogRow>(`
    select 
      al.id::text,
      al.at::text as at,
      al.action,
      al.entity_type,
      al.entity_id::text,
      al.actor_id::text,
      coalesce(p.full_name, 'System') as actor_name,
      p.email as actor_email,
      al.ip::text,
      al.request_id,
      al.device,
      al.before,
      al.after
    from core.audit_log al
    left join core.profiles p on p.id = al.actor_id
    order by al.at desc
    limit 250
  `);

  return <AuditClient initialLogs={result.rows} />;
}
