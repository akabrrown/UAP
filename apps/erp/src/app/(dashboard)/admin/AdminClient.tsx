"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Filter, X, Check, AlertCircle, UserPlus, History, User } from "lucide-react";
import { inviteUserAction } from "./actions";

interface Role {
  id: string;
  name: string;
  code: string;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  staff_no: string | null;
  status: string;
  department: string | null;
  role_name: string | null;
}

interface AdminClientProps {
  initialUsers: UserRow[];
  roles: Role[];
  initialStatus?: string;
}

export function AdminClient({ initialUsers, roles, initialStatus }: AdminClientProps) {
  const [users] = useState<UserRow[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || "all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffNo, setStaffNo] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.role_name && u.role_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("staffNo", staffNo);
      formData.set("department", department);
      formData.set("jobTitle", jobTitle);
      formData.set("roleId", roleId);

      const res = await inviteUserAction(formData);
      if (res?.success) {
        setFormSuccess(`Invitation sent successfully to ${email}.`);
        setFullName("");
        setEmail("");
        setPhone("");
        setStaffNo("");
        setDepartment("");
        setJobTitle("");
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(null);
        }, 1500);
      } else {
        setFormError(res?.error || "Failed to invite user");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">System Administration</h1>
          <p className="text-sm text-slate-500">Manage user identities, operational roles, and platform access.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/audit"
            className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            Audit Trail
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Invite User
          </button>
        </div>
      </div>

      {/* Admin Section Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <Link
          href="/admin"
          className="pb-2.5 border-b-2 border-navy-900 text-navy-900 flex items-center gap-2"
        >
          <User className="w-4 h-4 text-navy-900" />
          User Identities & Access
        </Link>
        <Link
          href="/admin/audit"
          className="pb-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
        >
          <History className="w-4 h-4 text-slate-400" />
          Audit Trail & Security Logs
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name, email, department, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded border border-slate-300 bg-white focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Staff Name</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Staff ID</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Email</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Assigned Role</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Department</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-ink font-medium">{u.full_name}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {u.staff_no ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                          {u.staff_no}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{u.role_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{u.department || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                          u.status === "active"
                            ? "bg-green-100 text-green-700"
                            : u.status === "suspended"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-gold-600 hover:text-gold-700 font-semibold"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-navy-900" />
                <h3 className="text-sm font-semibold text-ink">Invite Team Member</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kwame@techcore.com"
                  className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 focus:ring-1 focus:ring-navy-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Staff ID
                  </label>
                  <input
                    type="text"
                    value={staffNo}
                    onChange={(e) => setStaffNo(e.target.value)}
                    placeholder="EMP-0142"
                    className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233..."
                    className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Logistics"
                    className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Officer"
                    className="w-full h-9 px-3 rounded border border-slate-300 text-xs focus:border-navy-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full h-9 px-3 rounded border border-slate-300 bg-white text-xs text-ink focus:border-navy-800 outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-2.5 rounded bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
                >
                  {isPending ? "Sending Invitation..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
