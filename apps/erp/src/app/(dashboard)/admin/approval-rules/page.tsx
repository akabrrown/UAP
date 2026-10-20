import { Metadata } from "next";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { ApprovalRulesClient, ApprovalRuleItem } from "./ApprovalRulesClient";

export const metadata: Metadata = {
  title: "Approval Rules | Administration | UAP",
};

export default async function ApprovalRulesPage() {
  const session = await getSession();

  const rulesRes = await db.query(`
    select 
      id,
      action_type,
      min_amount_minor,
      max_amount_minor,
      currency,
      approver_role_code,
      delegate_role_code,
      min_approvers,
      sla_hours,
      aggregate_window_days,
      active
    from core.approval_rules
    order by action_type asc, min_amount_minor asc
  `);

  const rules: ApprovalRuleItem[] = rulesRes.rows.map((r) => ({
    id: r.id,
    action_type: r.action_type,
    min_amount_minor: r.min_amount_minor,
    max_amount_minor: r.max_amount_minor,
    currency: r.currency || "GHS",
    approver_role_code: r.approver_role_code,
    delegate_role_code: r.delegate_role_code,
    min_approvers: r.min_approvers || 1,
    sla_hours: r.sla_hours || 24,
    aggregate_window_days: r.aggregate_window_days,
    active: r.active !== false,
  }));

  const userRole = session?.role || "assembly_technician";
  const canEdit = userRole === "super_admin" || userRole === "management";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#f4b41a] uppercase tracking-wider">
            System Administration
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Approval Rules Matrix</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define multi-level authorization limits, escalation rules, and SLAs across procurement, inventory, and finance. (Section 13 Workflow)
          </p>
        </div>
      </div>

      <ApprovalRulesClient rules={rules} canEdit={canEdit} />
    </div>
  );
}
