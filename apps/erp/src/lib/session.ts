import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { isScope, type RoleCode, type Scope, ROLE_CODES } from "@uap/types";

export const SESSION_COOKIE = "uap_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

import type { Session } from "./session-utils";
export type { Session };

function signingKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(session: Session): Promise<void> {
  const token = await new SignJWT({
    name: session.fullName,
    email: session.email,
    role: session.role,
    scopes: [...session.scopes],
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(signingKey());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    const role = payload.role;
    if (
      typeof payload.sub !== "string" ||
      typeof role !== "string" ||
      !(ROLE_CODES as readonly string[]).includes(role) ||
      !Array.isArray(payload.scopes)
    ) {
      return null;
    }
    return {
      userId: payload.sub,
      fullName: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: role as RoleCode,
      scopes: payload.scopes.filter((s): s is Scope => typeof s === "string" && isScope(s)),
    };
  } catch {
    return null;
  }
}

export { hasAnyScope } from "./session-utils";
