"use server";

import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "node:crypto";

const InviteUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Valid email address is required"),
  phone: z.string().max(50).optional().nullable(),
  staffNo: z.string().max(50).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  roleId: z.string().uuid("Please select a valid role"),
});

export async function inviteUserAction(formData: FormData) {
  const session = await requireAnyScope(["users.manage"]);

  const parsed = InviteUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone")?.toString() || null,
    staffNo: formData.get("staffNo")?.toString() || null,
    department: formData.get("department")?.toString() || null,
    jobTitle: formData.get("jobTitle")?.toString() || null,
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const { fullName, email, phone, staffNo, department, jobTitle, roleId } = parsed.data;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Check if email already exists in profiles
    const emailCheck = await client.query(
      "SELECT id FROM core.profiles WHERE email = $1",
      [email]
    );
    if (emailCheck.rowCount && emailCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "A user with this email address already exists" };
    }

    // Verify role exists
    const roleCheck = await client.query("SELECT id, name FROM core.roles WHERE id = $1", [roleId]);
    if (roleCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Selected role is invalid" };
    }

    const newUserId = crypto.randomUUID();

    // Insert profile
    await client.query(
      `INSERT INTO core.profiles (
        id, full_name, email, phone, staff_no, job_title, department, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'invited', NOW(), NOW())`,
      [newUserId, fullName, email, phone, staffNo, jobTitle, department]
    );

    // Assign primary role
    await client.query(
      `INSERT INTO core.user_roles (user_id, role_id, is_primary, assigned_by, assigned_at)
       VALUES ($1, $2, true, $3, NOW())`,
      [newUserId, roleId, session.userId]
    );

    // Audit log
    await client.query(
      `INSERT INTO core.audit_log (actor_id, action, entity_type, entity_id, after)
       VALUES ($1, 'INVITE_USER', 'core.profiles', $2, $3::jsonb)`,
      [
        session.userId,
        newUserId,
        JSON.stringify({
          full_name: fullName,
          email,
          role_id: roleId,
          role_name: roleCheck.rows[0].name,
        }),
      ]
    );

    await client.query("COMMIT");
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : "Failed to invite user";
    return { success: false, error: msg };
  } finally {
    client.release();
  }

  revalidatePath("/admin");
  return { success: true };
}
