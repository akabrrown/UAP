"use server";

import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdateRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

const ToggleStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "suspended", "invited"]),
});

const UpdateDetailsSchema = z.object({
  userId: z.string().uuid(),
  department: z.string().max(100).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  staffNo: z.string().max(50).optional().nullable(),
});

export async function updateUserRoleAction(formData: FormData) {
  const session = await requireAnyScope(["roles.manage", "users.manage"]);

  const parsed = UpdateRoleSchema.safeParse({
    userId: formData.get("userId"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input parameters" };
  }

  const { userId, roleId } = parsed.data;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Check if role exists
    const roleCheck = await client.query("SELECT id, name FROM core.roles WHERE id = $1", [roleId]);
    if (roleCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Selected role does not exist" };
    }

    // Set all existing roles for this user as non-primary
    await client.query("DELETE FROM core.user_roles WHERE user_id = $1", [userId]);

    // Insert new primary role
    await client.query(
      `INSERT INTO core.user_roles (user_id, role_id, is_primary, assigned_by, assigned_at)
       VALUES ($1, $2, true, $3, NOW())`,
      [userId, roleId, session.userId]
    );

    // Audit log
    await client.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_ROLE', 'core.profiles', $2, $3::jsonb)`,
      [session.userId, userId, JSON.stringify({ new_role_id: roleId, role_name: roleCheck.rows[0].name })]
    );

    await client.query("COMMIT");
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : "Failed to update user role";
    return { success: false, error: msg };
  } finally {
    client.release();
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleUserStatusAction(formData: FormData) {
  const session = await requireAnyScope(["users.manage"]);

  const parsed = ToggleStatusSchema.safeParse({
    userId: formData.get("userId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid status" };
  }

  const { userId, status } = parsed.data;

  // Prevent admin from suspending themselves
  if (userId === session.userId && status === "suspended") {
    return { success: false, error: "Administrative protection: You cannot suspend your own active session." };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE core.profiles
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, userId]
    );

    await client.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_STATUS', 'core.profiles', $2, $3::jsonb)`,
      [session.userId, userId, JSON.stringify({ new_status: status })]
    );

    await client.query("COMMIT");
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : "Failed to update status";
    return { success: false, error: msg };
  } finally {
    client.release();
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function updateUserDetailsAction(formData: FormData) {
  const session = await requireAnyScope(["users.manage"]);

  const parsed = UpdateDetailsSchema.safeParse({
    userId: formData.get("userId"),
    department: formData.get("department")?.toString() || null,
    jobTitle: formData.get("jobTitle")?.toString() || null,
    phone: formData.get("phone")?.toString() || null,
    staffNo: formData.get("staffNo")?.toString() || null,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { userId, department, jobTitle, phone, staffNo } = parsed.data;
  const staffNumber = staffNo?.trim() || null;

  try {
    await db.query(
      `UPDATE core.profiles
       SET department = $1, job_title = $2, phone = $3, staff_no = $4, updated_at = NOW()
       WHERE id = $5`,
      [department, jobTitle, phone, staffNumber, userId]
    );

    // Audit log
    await db.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'UPDATE_PROFILE', 'core.profiles', $2, $3::jsonb)`,
      [
        session.userId,
        userId,
        JSON.stringify({ department, job_title: jobTitle, phone, staff_no: staffNumber }),
      ]
    );
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      return { success: false, error: "Staff number is already assigned to another user." };
    }
    const msg = err instanceof Error ? err.message : "Failed to update profile";
    return { success: false, error: msg };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
  return { success: true };
}
