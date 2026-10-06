"use server";

import { getSession, createSessionCookie } from "@/lib/session";
import { redirect } from "next/navigation";
import { SCOPES } from "@uap/types";
import { db } from "@/lib/db";

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString(); // In dev, we check this against a mock or direct PG call if using stub

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    try {
      // 1. Verify password via Supabase Auth REST API
      const authUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`;
      const authRes = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!authRes.ok) {
        return { error: "Invalid credentials or user not found." };
      }

      const authData = await authRes.json();
      const userId = authData.user.id;

      // 2. Fetch their profile and roles from the database
      const result = await db.query(`
        select p.id, p.full_name, p.is_admin, p.status,
               coalesce((select array_agg(r.code) from core.user_roles ur join core.roles r on r.id = ur.role_id where ur.user_id = p.id), '{}') as roles,
               coalesce((select array_agg(distinct s) from (
                 select unnest(r.default_scopes) as s from core.user_roles ur join core.roles r on r.id = ur.role_id where ur.user_id = p.id
                 union select unnest(p.extra_scopes)
               ) x), '{}') as scopes
        from core.profiles p
        where p.id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        return { error: "Profile missing. Contact support." };
      }

      const user = result.rows[0];

      if (user.status !== 'active') {
        return { error: "Account is not active." };
      }
      
      await createSessionCookie({
        userId: user.id,
        email: email,
        fullName: user.full_name,
        role: user.is_admin ? "super_admin" : (user.roles[0] || "assembly_technician"),
        scopes: user.is_admin ? [...SCOPES] : user.scopes,
      });

    } finally {
      // no-op, pool handles connections
    }
  } catch (err: any) {
    console.error(err);
    return { error: "An unexpected error occurred. Please try again." };
  }

  redirect("/");
}

export async function logoutAction() {
  const { clearSessionCookie } = await import("@/lib/session");
  await clearSessionCookie();
  redirect("/login");
}
