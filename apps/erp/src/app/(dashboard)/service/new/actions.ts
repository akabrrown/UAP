"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAnyScope } from "@/lib/session";
import { z } from "zod";

const CreateTicketSchema = z.object({
  kind: z.enum(["warranty_claim", "paid_repair", "inspection", "complaint", "preventive"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  contact_name: z.string().min(2, "Contact name must be at least 2 characters").max(100),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_email: z.string().email("Valid email required").optional().nullable().or(z.literal("")),
  device_serial: z.string().max(100).optional().nullable(),
  device_description: z.string().max(255).optional().nullable(),
  fault_description: z.string().min(5, "Fault description must be at least 5 characters").max(2000),
});

export async function createTicketAction(prevState: any, formData: FormData) {
  const session = await requireAnyScope(["service.write"]);

  const emailRaw = formData.get("contact_email")?.toString()?.trim();

  const parsed = CreateTicketSchema.safeParse({
    kind: formData.get("kind"),
    priority: formData.get("priority"),
    contact_name: formData.get("contact_name"),
    contact_phone: formData.get("contact_phone")?.toString() || null,
    contact_email: emailRaw ? emailRaw : null,
    device_serial: formData.get("device_serial")?.toString() || null,
    device_description: formData.get("device_description")?.toString() || null,
    fault_description: formData.get("fault_description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const {
    kind,
    priority,
    contact_name,
    contact_phone,
    contact_email,
    device_serial,
    device_description,
    fault_description,
  } = parsed.data;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `insert into svc.service_tickets (
         ticket_no, kind, priority, contact_name, contact_phone, contact_email,
         device_serial, device_description, fault_description, status, received_at
       ) values (core.next_doc_no('TKT'), $1, $2, $3, $4, $5, $6, $7, $8, 'received', NOW())
       returning id, ticket_no`,
      [
        kind,
        priority,
        contact_name,
        contact_phone || null,
        contact_email || null,
        device_serial || null,
        device_description || null,
        fault_description,
      ]
    );

    const ticketId = result.rows[0].id;
    const ticketNo = result.rows[0].ticket_no;

    // Log timeline event
    await client.query(
      `insert into svc.service_events (ticket_id, event_type, note, internal_only, created_at)
       values ($1, 'created', 'Ticket logged via system console', false, NOW())`,
      [ticketId]
    );

    // Audit log
    await client.query(
      `insert into core.audit_log (actor_id, action, entity_type, entity_id, after)
       values ($1, 'CREATE_TICKET', 'svc.service_tickets', $2, $3::jsonb)`,
      [session.userId, ticketId, JSON.stringify({ ticket_no: ticketNo, kind, priority })]
    );

    await client.query("COMMIT");
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error creating ticket:", error);
    return { error: error.message || "Failed to create service ticket." };
  } finally {
    client.release();
  }

  redirect("/service");
}
