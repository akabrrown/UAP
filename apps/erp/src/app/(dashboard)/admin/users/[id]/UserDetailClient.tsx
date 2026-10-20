"use client";

import { useState, useTransition } from "react";
import { updateUserRoleAction, toggleUserStatusAction, updateUserDetailsAction } from "./actions";
import { Shield, ShieldAlert, Check, AlertCircle, UserCheck, UserX, Save } from "lucide-react";

interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  default_scopes: string[];
}

interface UserDetailClientProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    staff_no: string | null;
    job_title: string | null;
    department: string | null;
    is_admin: boolean;
    status: "invited" | "active" | "suspended";
    extra_scopes: string[];
    revoked_scopes: string[];
    mfa_enrolled: boolean;
    created_at: string;
    last_seen_at: string | null;
  };
  roles: Role[];
  currentRoleId: string | null;
  currentUserId: string;
}

export function UserDetailClient({
  user,
  roles,
  currentRoleId,
  currentUserId,
}: UserDetailClientProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(currentRoleId || "");
  const [department, setDepartment] = useState(user.department || "");
  const [jobTitle, setJobTitle] = useState(user.job_title || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [staffNo, setStaffNo] = useState(user.staff_no || "");
  
  const [roleMessage, setRoleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [detailsMessage, setDetailsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isPendingRole, startTransitionRole] = useTransition();
  const [isPendingStatus, startTransitionStatus] = useTransition();
  const [isPendingDetails, startTransitionDetails] = useTransition();

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRoleMessage(null);
    startTransitionRole(async () => {
      const formData = new FormData();
      formData.set("userId", user.id);
      formData.set("roleId", selectedRoleId);
      const res = await updateUserRoleAction(formData);
      if (res?.success) {
        setRoleMessage({ type: "success", text: "Role updated successfully." });
      } else {
        setRoleMessage({ type: "error", text: res?.error || "Failed to update role." });
      }
    });
  };

  const handleStatusToggle = () => {
    setStatusMessage(null);
    const newStatus = user.status === "active" ? "suspended" : "active";
    startTransitionStatus(async () => {
      const formData = new FormData();
      formData.set("userId", user.id);
      formData.set("status", newStatus);
      const res = await toggleUserStatusAction(formData);
      if (res?.success) {
        setStatusMessage({ type: "success", text: `User marked as ${newStatus}.` });
      } else {
        setStatusMessage({ type: "error", text: res?.error || "Failed to update status." });
      }
    });
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsMessage(null);
    startTransitionDetails(async () => {
      const formData = new FormData();
      formData.set("userId", user.id);
      formData.set("department", department);
      formData.set("jobTitle", jobTitle);
      formData.set("phone", phone);
      formData.set("staffNo", staffNo);
      const res = await updateUserDetailsAction(formData);
      if (res?.success) {
        setDetailsMessage({ type: "success", text: "Profile details saved." });
      } else {
        setDetailsMessage({ type: "error", text: res?.error || "Failed to save details." });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Cols: Role & Scopes, and Profile Form */}
      <div className="lg:col-span-2 space-y-6">
        {/* Role & Access Management */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-navy-800" />
            <h2 className="text-base font-semibold text-ink">Role & Scope Assignment</h2>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Assigning a system role grants standard operational scopes defined by Techcore security policies.
          </p>

          <form onSubmit={handleRoleSubmit} className="space-y-4">
            <div>
              <label htmlFor="role-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary System Role
              </label>
              <select
                id="role-select"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                disabled={isPendingRole}
                className="w-full h-9 px-3 rounded border border-slate-300 bg-white text-sm text-ink focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none"
              >
                <option value="" disabled>
                  Select a role...
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            {selectedRole && (
              <div className="p-3.5 bg-slate-50 rounded border border-slate-200 text-xs space-y-2">
                <div className="text-slate-700 font-medium">{selectedRole.description || "System operational role"}</div>
                <div>
                  <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                    Inherited Scopes ({selectedRole.default_scopes?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {selectedRole.default_scopes?.map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-mono text-slate-600"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {roleMessage && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  roleMessage.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {roleMessage.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {roleMessage.text}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPendingRole || selectedRoleId === currentRoleId}
                className="px-4 py-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
              >
                {isPendingRole ? "Saving..." : "Update Role"}
              </button>
            </div>
          </form>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-ink">Staff Profile Details</h2>
          </div>

          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Manufacturing, Logistics"
                  className="w-full h-9 px-3 rounded border border-slate-300 text-sm focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Line Assembly Specialist"
                  className="w-full h-9 px-3 rounded border border-slate-300 text-sm focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233..."
                  className="w-full h-9 px-3 rounded border border-slate-300 text-sm focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Staff Number / Employee ID</label>
                <input
                  type="text"
                  value={staffNo}
                  onChange={(e) => setStaffNo(e.target.value)}
                  placeholder="e.g. TC-001 or EMP-101"
                  className="w-full h-9 px-3 rounded border border-slate-300 text-sm focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none font-mono"
                />
              </div>
            </div>

            {detailsMessage && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  detailsMessage.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {detailsMessage.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {detailsMessage.text}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPendingDetails}
                className="inline-flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {isPendingDetails ? "Saving..." : "Save Details"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Status & Security Card */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-4">Account Status & Security</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Current Status</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                  user.status === "active"
                    ? "bg-green-100 text-green-700"
                    : user.status === "suspended"
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {user.status}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">MFA Enrolled</span>
              <span className="text-xs font-medium text-slate-700">
                {user.mfa_enrolled ? "Yes (Hardware/TOTP)" : "No"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Created On</span>
              <span className="text-xs font-mono text-slate-700">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">Last Active</span>
              <span className="text-xs font-mono text-slate-700">
                {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : "Never"}
              </span>
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  statusMessage.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {statusMessage.type === "success" ? <Check className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                {statusMessage.text}
              </div>
            )}

            <div className="pt-4">
              {user.id === currentUserId ? (
                <p className="text-xs text-slate-400 italic text-center">
                  You cannot modify the status of your currently authenticated account.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleStatusToggle}
                  disabled={isPendingStatus}
                  className={`w-full py-2.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    user.status === "active"
                      ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                  }`}
                >
                  {user.status === "active" ? (
                    <>
                      <UserX className="w-4 h-4" />
                      {isPendingStatus ? "Suspending..." : "Suspend Account Access"}
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      {isPendingStatus ? "Activating..." : "Activate Account Access"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
