import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/session";
import { SCOPES } from "@uap/types";
import { db } from "@/lib/db";


export async function GET() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_TEST_LOGIN !== "true") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const testUserId = "00000000-0000-0000-0000-000000000001";
  
  // Ensure the test user profile exists in core.profiles to prevent foreign key errors
  try {
    await db.query(`
      insert into core.profiles (id, full_name, email, is_admin, status)
      values ($1, 'Test Admin', 'test-admin@upsa.edu.gh', true, 'active')
      on conflict (id) do update set is_admin = true, status = 'active'
    `, [testUserId]);
  } catch (err) {
    console.error("Failed to seed test user profile:", err);
  }

  await createSessionCookie({
    userId: testUserId,
    email: "test-admin@upsa.edu.gh",
    fullName: "Test Admin",
    role: "super_admin",
    scopes: [...SCOPES],
  });

  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"));
}
