"use client";

import { useState, useTransition } from "react";
import { 
  Sliders, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Play, 
  X,
  Shield,
  HelpCircle
} from "lucide-react";
import { 
  createApprovalRuleAction, 
  updateApprovalRuleAction, 
  toggleApprovalRuleAction 
} from "./actions";

export interface ApprovalRuleItem {
  id: string;
  action_type: string;
  min_amount_minor: string | number;
  max_amount_minor: string | number | null;
  currency: string;
  approver_role_code: string;
  delegate_role_code: string | null;
  min_approvers: number;
  sla_hours: number;
  aggregate_window_days: number | null;
  active: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  "po.submit": "Purchase Order Submit",
  "inventory.adjustment": "Stock Adjustment (> GHS 500)",
  "sales.order": "Internal Sales Order",
  "expense.submit": "Expense Voucher",
  "period.close": "Financial Period Close",
  "bank_detail.update": "Supplier Bank Detail Change",
  "reversal.post": "Financial Journal Reversal",
};

export function ApprovalRulesClient({
  rules,
  canEdit,
}: {
  rules: ApprovalRuleItem[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRuleItem | null>(null);
  const [formActionType, setFormActionType] = useState("po.submit");
  const [formMinAmount, setFormMinAmount] = useState("0");
  const [formMaxAmount, setFormMaxAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("GHS");
  const [formApproverRole, setFormApproverRole] = useState("management");
  const [formDelegateRole, setFormDelegateRole] = useState("");
  const [formMinApprovers, setFormMinApprovers] = useState("1");
  const [formSlaHours, setFormSlaHours] = useState("24");
  const [formAggregateWindow, setFormAggregateWindow] = useState("");

  // Test Simulator State
  const [simAction, setSimAction] = useState("po.submit");
  const [simAmount, setSimAmount] = useState("15000");
  const [simResult, setSimResult] = useState<{
    matched: boolean;
    rule?: ApprovalRuleItem;
    approver?: string;
    delegate?: string;
    sla?: number;
    autoApproved?: boolean;
  } | null>(null);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormActionType("po.submit");
    setFormMinAmount("0");
    setFormMaxAmount("");
    setFormCurrency("GHS");
    setFormApproverRole("management");
    setFormDelegateRole("");
    setFormMinApprovers("1");
    setFormSlaHours("24");
    setFormAggregateWindow("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: ApprovalRuleItem) => {
    setEditingRule(rule);
    setFormActionType(rule.action_type);
    setFormMinAmount((Number(rule.min_amount_minor) / 100).toString());
    setFormMaxAmount(rule.max_amount_minor ? (Number(rule.max_amount_minor) / 100).toString() : "");
    setFormCurrency(rule.currency);
    setFormApproverRole(rule.approver_role_code);
    setFormDelegateRole(rule.delegate_role_code || "");
    setFormMinApprovers(rule.min_approvers.toString());
    setFormSlaHours(rule.sla_hours.toString());
    setFormAggregateWindow(rule.aggregate_window_days ? rule.aggregate_window_days.toString() : "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      action_type: formActionType,
      min_amount: parseFloat(formMinAmount) || 0,
      max_amount: formMaxAmount ? parseFloat(formMaxAmount) : null,
      currency: formCurrency,
      approver_role_code: formApproverRole,
      delegate_role_code: formDelegateRole || null,
      min_approvers: parseInt(formMinApprovers, 10) || 1,
      sla_hours: parseInt(formSlaHours, 10) || 24,
      aggregate_window_days: formAggregateWindow ? parseInt(formAggregateWindow, 10) : null,
    };

    startTransition(async () => {
      let res;
      if (editingRule) {
        res = await updateApprovalRuleAction(editingRule.id, payload);
      } else {
        res = await createApprovalRuleAction(payload);
      }

      if (res.success) {
        setIsModalOpen(false);
      } else {
        setError(res.error || "Failed to save approval rule");
      }
    });
  };

  const handleToggleActive = (rule: ApprovalRuleItem) => {
    setError(null);
    startTransition(async () => {
      const res = await toggleApprovalRuleAction(rule.id, !rule.active);
      if (!res.success) {
        setError(res.error || "Failed to update rule status");
      }
    });
  };

  const handleRunSimulator = () => {
    const amt = parseFloat(simAmount) || 0;
    const minor = Math.round(amt * 100);

    const matching = rules
      .filter((r) => r.active && r.action_type === simAction)
      .find((r) => {
        const min = Number(r.min_amount_minor);
        const max = r.max_amount_minor !== null ? Number(r.max_amount_minor) : Infinity;
        return minor >= min && minor <= max;
      });

    if (matching) {
      setSimResult({
        matched: true,
        rule: matching,
        approver: matching.approver_role_code,
        delegate: matching.delegate_role_code || "None",
        sla: matching.sla_hours,
        autoApproved: false,
      });
    } else {
      setSimResult({
        matched: false,
        autoApproved: true,
      });
    }
  };

  const hasDisabledRules = rules.some((r) => !r.active);

  return (
    <div className="space-y-6">
      {/* Top Banner if Disabled Rules Exist */}
      {hasDisabledRules && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Notice on Disabled Rules:</strong> When an approval rule is disabled, operations falling within that range are auto-approved without routing to Management or Super Admin sign-off.
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold text-rose-600 hover:text-rose-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Test Rule Simulator */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
          <Play className="w-4 h-4 text-[#f4b41a] fill-[#f4b41a]" />
          <span>Interactive Approval Rule Simulator</span>
        </div>
        <p className="text-xs text-slate-500">
          Test any transaction scenario to verify which approval tier, role, and SLA hours will be triggered before posting.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Action</label>
            <select
              value={simAction}
              onChange={(e) => setSimAction(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
            >
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sample Amount (GHS)</label>
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              placeholder="15000"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
            />
          </div>
          <div>
            <button
              onClick={handleRunSimulator}
              className="w-full py-2 px-4 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47] transition-colors shadow-sm"
            >
              Simulate Evaluation
            </button>
          </div>
        </div>

        {simResult && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
              simResult.autoApproved
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            <div>
              {simResult.autoApproved ? (
                <div>
                  <strong>Outcome: AUTO-APPROVED.</strong> Amount GHS {parseFloat(simAmount).toLocaleString()} is below threshold or no active rule matches. Action posts immediately without approval bottleneck.
                </div>
              ) : (
                <div>
                  <strong>Outcome: APPROVAL REQUIRED.</strong> Routed to{" "}
                  <span className="font-semibold uppercase tracking-wider underline">
                    {simResult.approver?.replace("_", " ")}
                  </span>
                  {simResult.delegate && simResult.delegate !== "None" && (
                    <span> (Escalation / Delegate: {simResult.delegate})</span>
                  )}
                  . Minimum sign-offs: {simResult.rule?.min_approvers}. SLA: {simResult.sla} hours.
                </div>
              )}
            </div>
            <button
              onClick={() => setSimResult(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Rules Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Multi-Level Threshold Matrix</h2>
            <p className="text-xs text-slate-500">Configured approval boundaries across procurement, finance, and inventory.</p>
          </div>
          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47] transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Approval Rule</span>
            </button>
          )}
        </div>

        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Action Type</th>
              <th className="px-4 py-3">Amount Range</th>
              <th className="px-4 py-3">Approver Role</th>
              <th className="px-4 py-3">Delegate</th>
              <th className="px-4 py-3">Min Approvers / SLA</th>
              <th className="px-4 py-3">Status</th>
              {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-8 text-center text-slate-400 text-xs">
                  No approval rules configured. All actions are currently auto-approved.
                </td>
              </tr>
            ) : (
              rules.map((r) => {
                const min = Number(r.min_amount_minor) / 100;
                const max = r.max_amount_minor !== null ? Number(r.max_amount_minor) / 100 : null;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">
                      {ACTION_LABELS[r.action_type] || r.action_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.currency} {min.toLocaleString()}
                      {max !== null ? ` – ${r.currency} ${max.toLocaleString()}` : " +"}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">
                      <span className="font-semibold text-slate-800">
                        {r.approver_role_code.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.delegate_role_code ? r.delegate_role_code.replace("_", " ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-800">{r.min_approvers} sign-off</span>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-0.5 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {r.sla_hours}h
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          r.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleActive(r)}
                            disabled={isPending}
                            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                              r.active
                                ? "text-amber-700 hover:bg-amber-50"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {r.active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded"
                            title="Edit Rule"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRule}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRule ? "Edit Approval Rule" : "Create New Approval Rule"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Action Type
                </label>
                <select
                  value={formActionType}
                  onChange={(e) => setFormActionType(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
                >
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Min Amount (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formMinAmount}
                  onChange={(e) => setFormMinAmount(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Amount (Leave blank if unlimited)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formMaxAmount}
                  onChange={(e) => setFormMaxAmount(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approver Role
                </label>
                <select
                  value={formApproverRole}
                  onChange={(e) => setFormApproverRole(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
                >
                  <option value="management">Management</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="finance_service">Finance & Service</option>
                  <option value="procurement_imports">Procurement & Imports</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delegate / Escalation Role
                </label>
                <select
                  value={formDelegateRole}
                  onChange={(e) => setFormDelegateRole(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
                >
                  <option value="">None</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="management">Management</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Min Approvers Required
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formMinApprovers}
                  onChange={(e) => setFormMinApprovers(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SLA Hours
                </label>
                <input
                  type="number"
                  min="1"
                  value={formSlaHours}
                  onChange={(e) => setFormSlaHours(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aggregate Window for Supplier POs (Days)
                </label>
                <input
                  type="number"
                  value={formAggregateWindow}
                  onChange={(e) => setFormAggregateWindow(e.target.value)}
                  placeholder="E.g. 7 (prevents split PO circumvention)"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0b192c]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0b192c] text-[#f4b41a] rounded-lg hover:bg-[#1a2d47] disabled:opacity-50 transition-colors shadow-sm"
              >
                {isPending ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
