"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createApprovalRuleAction(data: {
  action_type: string;
  min_amount: number;
  max_amount: number | null;
  currency: string;
  approver_role_code: string;
  delegate_role_code?: string | null;
  min_approvers: number;
  sla_hours: number;
  aggregate_window_days?: number | null;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const minMinor = Math.round(data.min_amount * 100);
  const maxMinor = data.max_amount !== null && data.max_amount !== undefined ? Math.round(data.max_amount * 100) : null;

  try {
    const res = await db.query(
      `insert into core.approval_rules (
        action_type, min_amount_minor, max_amount_minor, currency,
        approver_role_code, delegate_role_code, min_approvers, sla_hours, aggregate_window_days, active
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      returning id`,
      [
        data.action_type,
        minMinor,
        maxMinor,
        data.currency || "GHS",
        data.approver_role_code,
        data.delegate_role_code || null,
        data.min_approvers || 1,
        data.sla_hours || 24,
        data.aggregate_window_days || null,
      ]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('approval_rule.create', 'core.approval_rules', $1, $2, $3)`,
      [res.rows[0].id, session.userId, JSON.stringify(data)]
    );

    revalidatePath("/admin/approval-rules");
    return { success: true, id: res.rows[0].id };
  } catch (err: any) {
    console.error("createApprovalRuleAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateApprovalRuleAction(
  ruleId: string,
  data: {
    action_type: string;
    min_amount: number;
    max_amount: number | null;
    currency: string;
    approver_role_code: string;
    delegate_role_code?: string | null;
    min_approvers: number;
    sla_hours: number;
    aggregate_window_days?: number | null;
  }
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const minMinor = Math.round(data.min_amount * 100);
  const maxMinor = data.max_amount !== null && data.max_amount !== undefined ? Math.round(data.max_amount * 100) : null;

  try {
    await db.query(
      `update core.approval_rules
       set action_type = $1,
           min_amount_minor = $2,
           max_amount_minor = $3,
           currency = $4,
           approver_role_code = $5,
           delegate_role_code = $6,
           min_approvers = $7,
           sla_hours = $8,
           aggregate_window_days = $9,
           updated_at = now()
       where id = $10`,
      [
        data.action_type,
        minMinor,
        maxMinor,
        data.currency || "GHS",
        data.approver_role_code,
        data.delegate_role_code || null,
        data.min_approvers || 1,
        data.sla_hours || 24,
        data.aggregate_window_days || null,
        ruleId,
      ]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ('approval_rule.update', 'core.approval_rules', $1, $2, $3)`,
      [ruleId, session.userId, JSON.stringify(data)]
    );

    revalidatePath("/admin/approval-rules");
    return { success: true };
  } catch (err: any) {
    console.error("updateApprovalRuleAction error:", err);
    return { success: false, error: err.message };
  }
}

export async function toggleApprovalRuleAction(ruleId: string, active: boolean) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    await db.query(
      `update core.approval_rules set active = $1, updated_at = now() where id = $2`,
      [active, ruleId]
    );

    await db.query(
      `insert into core.audit_log (
        action, entity_type, entity_id, actor_id, new_data
      ) values ($1, 'core.approval_rules', $2, $3, $4)`,
      [
        active ? "approval_rule.enable" : "approval_rule.disable",
        ruleId,
        session.userId,
        JSON.stringify({ active }),
      ]
    );

    revalidatePath("/admin/approval-rules");
    return { success: true };
  } catch (err: any) {
    console.error("toggleApprovalRuleAction error:", err);
    return { success: false, error: err.message };
  }
}
