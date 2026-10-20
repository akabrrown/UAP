import { Metadata } from "next";
import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { AdminClient } from "../AdminClient";

export const metadata: Metadata = {
  title: "Users & Staff Directory | Administration | UAP",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  await requireAnyScope(["users.manage", "roles.manage", "settings.write"]);

  const resolvedParams = searchParams ? await searchParams : {};

  const [usersRes, rolesRes] = await Promise.all([
    db.query(`
      select p.id, p.full_name, p.email, p.staff_no, p.status, p.department,
             r.name as role_name
      from core.profiles p
      left join core.user_roles ur on ur.user_id = p.id and ur.is_primary = true
      left join core.roles r on r.id = ur.role_id
      order by p.created_at desc
      limit 150
    `),
    db.query(`
      select id, name, code
      from core.roles
      order by name asc
    `),
  ]);

  return (
    <div className="space-y-6">
      <AdminClient
        initialUsers={usersRes.rows}
        roles={rolesRes.rows}
        initialStatus={resolvedParams.status}
      />
    </div>
  );
}
