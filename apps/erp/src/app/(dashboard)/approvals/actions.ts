"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DecideApprovalSchema = z.object({
  approvalId: z.string().uuid("Invalid approval identifier"),
  decision: z.enum(["approved", "rejected"]),
  decisionNote: z.string().max(1000).optional().nullable(),
});

export async function decideApprovalAction(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: "Authentication required." };
  }

  const parsed = DecideApprovalSchema.safeParse({
    approvalId: formData.get("approval_id"),
    decision: formData.get("decision"),
    decisionNote: formData.get("decision_note")?.toString()?.trim() || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid approval parameters" };
  }

  const { approvalId, decision, decisionNote } = parsed.data;

  if (decision === "rejected" && (!decisionNote || decisionNote.length === 0)) {
    return { error: "A decision note stating the reason for rejection is mandatory (per FR-ID-06)." };
  }

  // Fetch approval record
  const checkRes = await db.query(
    `select id, subject_type, subject_id, requested_by, status, amount_minor, currency from core.approvals where id = $1`,
    [approvalId]
  );
  const approval = checkRes.rows[0];

  if (!approval) {
    return { error: "Approval record not found." };
  }

  if (approval.status !== "pending") {
    return { error: `Approval is already marked as ${approval.status}.` };
  }

  // Dual custody check: Requesters cannot approve their own requests
  if (approval.requested_by === session.userId) {
    return { error: "Dual custody policy violation: Requesters cannot approve or reject their own requests." };
  }

  // Scope authorization based on subject_type
  const requiredScopeMap: Record<string, string> = {
    purchase_order: "procurement.approve",
    internal_order: "orders.approve",
    payment: "payments.approve",
    expense: "expenses.approve",
    adjustment: "inventory.adjust.approve",
    bom: "bom.approve",
    service_ticket: "service.approve",
  };

  const reqScope = requiredScopeMap[approval.subject_type];
  const userScopes = session.scopes as string[];
  if (reqScope && !userScopes.includes("*") && !userScopes.includes(reqScope)) {
    return { error: `You lack the required scope (${reqScope}) to decide this approval.` };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `update core.approvals
       set status = $1, decided_by = $2, decided_at = now(), decision_note = $3, updated_at = now()
       where id = $4 and status = 'pending'`,
      [decision, session.userId, decisionNote, approvalId]
    );

    if (decision === "approved") {
      if (approval.subject_type === "purchase_order") {
        await client.query(
          `update proc.purchase_orders set status = 'approved', updated_at = now() where id = $1`,
          [approval.subject_id]
        );
      } else if (approval.subject_type === "internal_order") {
        await client.query(
          `update sales.internal_orders set status = 'approved', updated_at = now() where id = $1`,
          [approval.subject_id]
        );
      } else if (approval.subject_type === "payment") {
        await client.query(
          `update fin.payments set status = 'posted', updated_at = now() where id = $1`,
          [approval.subject_id]
        );
      } else if (approval.subject_type === "expense") {
        await client.query(
          `update fin.expenses set status = 'approved', updated_at = now() where id = $1`,
          [approval.subject_id]
        );
      }
    } else if (decision === "rejected") {
      if (approval.subject_type === "purchase_order") {
        await client.query(
          `update proc.purchase_orders set status = 'cancelled', updated_at = now() where id = $1`,
          [approval.subject_id]
        );
      } else if (approval.subject_type === "internal_order") {
        await client.query(
          `update sales.internal_orders set status = 'cancelled', updated_at = now() where id = $1`,
          [approval.subject_id]
        );
      } else if (approval.subject_type === "expense") {
        await client.query(
          `update fin.expenses set status = 'rejected', updated_at = now() where id = $1`,
          [approval.subject_id]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Failed to process approval decision:", err);
    return { error: err.message || "Failed to record approval decision." };
  } finally {
    client.release();
  }

  revalidatePath("/approvals");
  revalidatePath(`/approvals/${approvalId}`);
  return { success: true };
}
