"use server";

import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateServiceTicketAction(
  ticketId: string,
  data: {
    priority?: string;
    status?: string;
    contactName?: string;
    contactPhone?: string | null;
    contactEmail?: string | null;
    faultDescription?: string;
    diagnosis?: string | null;
    resolution?: string | null;
  }
) {
  try {
    const session = await requireAnyScope(["service.write", "service.work"]);

    const ticketCheck = await db.query(
      `SELECT status FROM svc.service_tickets WHERE id = $1`,
      [ticketId]
    );

    if (ticketCheck.rows.length === 0) {
      return { success: false, error: "Service ticket not found" };
    }

    await db.query(
      `UPDATE svc.service_tickets
       SET priority = coalesce($1, priority),
           status = coalesce($2, status),
           contact_name = coalesce($3, contact_name),
           contact_phone = coalesce($4, contact_phone),
           contact_email = coalesce($5, contact_email),
           fault_description = coalesce($6, fault_description),
           diagnosis = coalesce($7, diagnosis),
           resolution = coalesce($8, resolution),
           updated_at = now()
       WHERE id = $9`,
      [
        data.priority || null,
        data.status || null,
        data.contactName || null,
        data.contactPhone || null,
        data.contactEmail || null,
        data.faultDescription || null,
        data.diagnosis || null,
        data.resolution || null,
        ticketId,
      ]
    );

    // Timeline event
    await db.query(
      `INSERT INTO svc.service_events (ticket_id, event_type, note, internal_only, created_at)
       VALUES ($1, 'updated', 'Ticket details updated by technician', false, now())`,
      [ticketId]
    );

    // Audit trail
    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_SERVICE_TICKET', 'svc.service_tickets', $2, $3::jsonb)`,
      [session.userId, ticketId, JSON.stringify(data)]
    );

    revalidatePath(`/service/${ticketId}`);
    revalidatePath("/service");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update service ticket:", err);
    return { success: false, error: err.message || "Failed to update service ticket" };
  }
}

export async function deleteServiceTicketAction(ticketId: string) {
  try {
    const session = await requireAnyScope(["service.write"]);

    const ticketRes = await db.query(
      `SELECT ticket_no, status FROM svc.service_tickets WHERE id = $1`,
      [ticketId]
    );

    if (ticketRes.rows.length === 0) {
      return { success: false, error: "Service ticket not found" };
    }

    const ticket = ticketRes.rows[0];

    // Check if parts were recorded
    const partsCheck = await db.query(
      `SELECT count(*) as count FROM svc.service_parts WHERE ticket_id = $1`,
      [ticketId]
    );
    const hasParts = Number(partsCheck.rows[0]?.count || 0) > 0;

    if (hasParts || ticket.status === "in_repair" || ticket.status === "ready_for_collection") {
      // Soft decline/close to preserve parts audit trail
      await db.query(
        `UPDATE svc.service_tickets SET status = 'declined', updated_at = now() WHERE id = $1`,
        [ticketId]
      );

      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
         VALUES ($1, 'DECLINE_SERVICE_TICKET', 'svc.service_tickets', $2, '{"status": "declined"}'::jsonb)`,
        [session.userId, ticketId]
      );

      revalidatePath(`/service/${ticketId}`);
      revalidatePath("/service");
      return { success: true, declined: true };
    } else {
      // Delete timeline events then ticket
      await db.query(`DELETE FROM svc.service_events WHERE ticket_id = $1`, [ticketId]);
      await db.query(`DELETE FROM svc.service_tickets WHERE id = $1`, [ticketId]);

      await db.query(
        `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, before)
         VALUES ($1, 'DELETE_SERVICE_TICKET', 'svc.service_tickets', $2, $3::jsonb)`,
        [session.userId, ticketId, JSON.stringify({ ticket_no: ticket.ticket_no })]
      );

      revalidatePath("/service");
      return { success: true, declined: false };
    }
  } catch (err: any) {
    console.error("Failed to delete service ticket:", err);
    return { success: false, error: err.message || "Failed to delete service ticket" };
  }
}
