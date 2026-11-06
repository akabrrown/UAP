import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/session";
import { SCOPES, type RoleCode } from "@uap/types";
import { db } from "@/lib/db";

const ROLE_PROFILES: Record<
  string,
  { id: string; name: string; email: string; role: RoleCode; staffNo: string }
> = {
  super_admin: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "System Administrator",
    email: "admin@upsa.edu.gh",
    role: "super_admin",
    staffNo: "UPSA-ADM-001",
  },
  procurement_imports: {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Kofi Mensah (Procurement)",
    email: "kofi.mensah@upsa.edu.gh",
    role: "procurement_imports",
    staffNo: "UPSA-PI-014",
  },
  inventory_sales: {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Ama Serwaa (Stores & Sales)",
    email: "ama.serwaa@upsa.edu.gh",
    role: "inventory_sales",
    staffNo: "UPSA-IS-008",
  },
  assembly_technician: {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Kwame Asante (Assembly Tech)",
    email: "kwame.asante@upsa.edu.gh",
    role: "assembly_technician",
    staffNo: "UPSA-AT-023",
  },
  qc_inspector: {
    id: "00000000-0000-0000-0000-000000000005",
    name: "Esi Darko (QC Lead)",
    email: "esi.darko@upsa.edu.gh",
    role: "qc_inspector",
    staffNo: "UPSA-QI-005",
  },
  finance_service: {
    id: "00000000-0000-0000-0000-000000000006",
    name: "Yaw Boateng (Finance & Service)",
    email: "yaw.boateng@upsa.edu.gh",
    role: "finance_service",
    staffNo: "UPSA-FS-019",
  },
  management: {
    id: "00000000-0000-0000-0000-000000000007",
    name: "Dr. Abena Osei (Operations Manager)",
    email: "abena.osei@upsa.edu.gh",
    role: "management",
    staffNo: "UPSA-MGT-002",
  },
};

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_TEST_LOGIN !== "true") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const roleKey = searchParams.get("role") || "super_admin";
  const profile = ROLE_PROFILES[roleKey] || ROLE_PROFILES.super_admin;
  const redirectTarget = searchParams.get("redirect") || "/";

  // Ensure the role user profile exists in auth.users and core.profiles to prevent foreign key errors
  try {
    await db.query(
      `insert into auth.users (id, aud, role, email)
       values ($1, 'authenticated', 'authenticated', $2)
       on conflict (id) do update set email = excluded.email`,
      [profile.id, profile.email]
    );
    await db.query(
      `insert into core.profiles (id, full_name, email, staff_no, is_admin, status)
       values ($1, $2, $3, $4, $5, 'active')
       on conflict (id) do update 
       set full_name = excluded.full_name, email = excluded.email, staff_no = excluded.staff_no, status = 'active'`,
      [profile.id, profile.name, profile.email, profile.staffNo, profile.role === "super_admin"]
    );
  } catch (err) {
    console.error("Failed to seed test user profile:", err);
  }

  // Fetch actual default scopes for role or fall back to full scopes
  let scopes: string[] = [...SCOPES];
  try {
    const roleRes = await db.query(
      `select default_scopes from core.roles where code = $1`,
      [profile.role]
    );
    if (roleRes.rows[0]?.default_scopes?.length) {
      // Ensure the user has their role scopes plus core essentials
      scopes = Array.from(new Set([...roleRes.rows[0].default_scopes, "catalog.read", "inventory.read", "orders.read"]));
    }
  } catch (e) {
    console.warn("Could not load default scopes from db:", e);
  }

  if (profile.role === "super_admin" || profile.role === "management") {
    scopes = [...SCOPES];
  }

  await createSessionCookie({
    userId: profile.id,
    email: profile.email,
    fullName: profile.name,
    role: profile.role,
    scopes: scopes as any,
    staffNo: profile.staffNo,
  });

  return NextResponse.redirect(new URL(redirectTarget, process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001"));
}
