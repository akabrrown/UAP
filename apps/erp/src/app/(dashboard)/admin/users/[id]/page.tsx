import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { UserDetailClient } from "./UserDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const session = await requireAnyScope(["users.manage", "roles.manage", "settings.write"]);
  const { id } = await params;

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  // Fetch user profile
  const userRes = await db.query(
    `SELECT id, full_name, email, phone, staff_no, job_title, department,
            is_admin, status, extra_scopes, revoked_scopes, mfa_enrolled,
            created_at, last_seen_at
     FROM core.profiles
     WHERE id = $1`,
    [id]
  );

  if (userRes.rowCount === 0) {
    notFound();
  }

  const user = userRes.rows[0];

  // Fetch user current primary role
  const userRoleRes = await db.query(
    `SELECT role_id FROM core.user_roles WHERE user_id = $1 AND is_primary = true`,
    [id]
  );
  const currentRoleId = userRoleRes.rows[0]?.role_id || null;

  // Fetch all available roles
  const rolesRes = await db.query(
    `SELECT id, name, code, description, default_scopes
     FROM core.roles
     ORDER BY name ASC`
  );
  const roles = rolesRes.rows;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <Link href="/admin" className="hover:text-navy-900 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to System Administration
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">User Profile: {user.full_name}</span>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-900 font-semibold text-lg">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink">{user.full_name}</h1>
              {user.is_admin && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gold-100 text-gold-700">
                  Super Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold capitalize ${
              user.status === "active"
                ? "bg-green-100 text-green-700"
                : user.status === "suspended"
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Status: {user.status}
          </span>
        </div>
      </div>

      {/* Interactive Management Controls */}
      <UserDetailClient
        user={{
          ...user,
          created_at: user.created_at.toISOString(),
          last_seen_at: user.last_seen_at ? user.last_seen_at.toISOString() : null,
        }}
        roles={roles}
        currentRoleId={currentRoleId}
        currentUserId={session.userId}
      />
    </div>
  );
}
