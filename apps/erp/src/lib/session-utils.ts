import { isScope, type RoleCode, type Scope, ROLE_CODES } from "@uap/types";

export interface Session {
  userId: string;
  fullName: string;
  email: string;
  role: RoleCode;
  scopes: readonly Scope[];
}

export function hasScope(session: Session | null, scope: Scope): boolean {
  if (!session) return false;
  return session.scopes.includes(scope);
}

export function hasAnyScope(session: Session | null, scopes?: readonly Scope[]): boolean {
  if (!scopes || scopes.length === 0) return true;
  if (!session) return false;
  return scopes.some(scope => session.scopes.includes(scope));
}
