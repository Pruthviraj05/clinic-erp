import { cookies } from "next/headers";
import { cache } from "react";
import type { Role } from "./rbac";
import { getDemoUserByRole } from "@/server/demo/data";

/**
 * Session abstraction (auth-swappable).
 *
 * TEMPORARY: the session is derived from a signed-free cookie set by the role
 * switcher on the login screen. There is no password check yet — selecting a
 * role opens its dashboard.
 *
 * DESIGNED FOR REAL AUTH: every consumer goes through `getSession()`. When
 * real authentication is added (NextAuth / Clerk / custom JWT), only this file
 * changes — swap the cookie read for a verified token/session lookup and the
 * rest of the app is unaffected. The shape of `Session` is the contract.
 */

export const SESSION_COOKIE = "clinicore_role";

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  organizationId: string;
  branchId?: string;
  /** Branches a doctor/receptionist may act within. */
  branchIds: string[];
}

export interface Session {
  user: SessionUser;
}

/**
 * Resolve the current session, or null if unauthenticated.
 * `cache()` dedupes the lookup within a single server request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const role = store.get(SESSION_COOKIE)?.value as Role | undefined;
  if (!role) return null;

  // In demo mode we hydrate a representative user for the selected role.
  const user = getDemoUserByRole(role);
  if (!user) return null;

  return { user };
});

/** Throwing variant for server components/actions that require a session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}
