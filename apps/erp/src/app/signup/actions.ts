"use server";

import { redirect } from "next/navigation";
import { createSessionCookie } from "@/lib/session";
import { SCOPES } from "@uap/types";
import pg from "pg";

export async function signupAction(prevState: any, formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("fullName")?.toString();

  if (!email || !password || !fullName) {
    return { error: "All fields are required." };
  }

  try {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:54329/uap" });
    await client.connect();

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

      // Ensure profile exists and is admin
      await client.query(`
        insert into core.profiles (id, full_name, is_admin, status)
        values ($1, $2, true, 'active')
        on conflict (id) do update set is_admin = true, status = 'active'
      `, [userId, fullName]);

      await createSessionCookie({
        userId: userId,
        email: email,
        fullName: fullName,
        role: "super_admin",
        scopes: [...SCOPES],
      });
      
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error(err);
    return { error: "An unexpected error occurred. Please try again." };
  }

  redirect("/");
}
