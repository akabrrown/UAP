"use server";

import { redirect } from "next/navigation";
import { createSessionCookie } from "@/lib/session";
import { SCOPES } from "@uap/types";
import { db } from "@/lib/db";

export async function signupAction(prevState: any, formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("fullName")?.toString();

  if (!email || !password || !fullName) {
    return { error: "All fields are required." };
  }

  // Server-side guard: Only allow one-time setup if no profiles exist
  const existingAdmin = await db.query("select 1 from core.profiles limit 1");
  if (existingAdmin.rowCount && existingAdmin.rowCount > 0) {
    return { error: "System is already initialized. Registration is disabled." };
  }

  try {
    try {
      const authUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`;
      const authRes = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ email, password, data: { full_name: fullName } }),
      });

      if (!authRes.ok) {
        const err = await authRes.json();
        return { error: err.msg || "Signup failed." };
      }

      const authData = await authRes.json();
      const userId = authData.user.id;

      await db.query(`
        insert into core.profiles (id, full_name, email, is_admin, status)
        values ($1, $2, $3, true, 'active')
        on conflict (id) do update set is_admin = true, status = 'active'
      `, [userId, fullName, email]);

      await createSessionCookie({
        userId: userId,
        email: email,
        fullName: fullName,
        role: "super_admin",
        scopes: [...SCOPES],
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
