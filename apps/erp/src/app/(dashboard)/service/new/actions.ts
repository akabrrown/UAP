"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function createTicketAction(prevState: any, formData: FormData) {
  const kind = formData.get("kind")?.toString();
  const priority = formData.get("priority")?.toString();
  const contact_name = formData.get("contact_name")?.toString();
  const contact_phone = formData.get("contact_phone")?.toString();
  const contact_email = formData.get("contact_email")?.toString();
  const device_serial = formData.get("device_serial")?.toString();
  const device_description = formData.get("device_description")?.toString();
  const fault_description = formData.get("fault_description")?.toString();

  if (!kind || !priority || !contact_name || !fault_description) {
    return { error: "Missing required fields." };
  }

  try {
    const result = await db.query(
      `insert into svc.service_tickets (
         kind, priority, contact_name, contact_phone, contact_email,
         device_serial, device_description, fault_description
       ) values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        kind, priority, contact_name, contact_phone || null, contact_email || null,
        device_serial || null, device_description || null, fault_description
      ]
    );

    const ticketId = result.rows[0].id;
    // Log timeline event
    await db.query(
      `insert into svc.service_events (ticket_id, event_type, note, internal_only)
       values ($1, 'created', 'Ticket logged via system', false)`,
      [ticketId]
    );
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    return { error: "Failed to create service ticket." };
  }

  redirect("/service");
}
