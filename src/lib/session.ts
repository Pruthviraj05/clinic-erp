import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "./rbac";
import { getDemoUserByRole, DEMO_ORG_ID } from "@/server/demo/data";
import { db } from "@/server/repositories";

/**
 * Session abstraction.
 *
 * Two cookies, two resolution paths, checked in order:
 * 1. `clinicore_session` — the REAL login. Holds `<userId>.<hmac>`, signed
 *    with SESSION_SECRET so it can't be forged by editing the cookie value.
 *    Resolves against `db.users` (+ the linked Doctor/Receptionist/Patient
 *    record for branch scoping) — this is what `signInWithPassword` sets.
 * 2. `clinicore_role` — the ORIGINAL demo role-switcher. Kept as a hidden,
 *    unlinked dev fallback (see /dev-login) for quickly checking any screen
 *    without a password. Resolves to a synthetic demo user, unrelated to the
 *    real `users` collection.
 *
 * Every consumer goes through `getSession()` — swapping or removing either
 * path only touches this file.
 */

export const SESSION_COOKIE = "clinicore_session";
export const DEMO_ROLE_COOKIE = "clinicore_role";

/**
 * The demo role-switcher hands out a full session with no password. It is a
 * development convenience ONLY: once real credentials are in use, or in a
 * production build, it must not exist — otherwise anyone who knows the URL
 * can sign in as ADMIN and read every patient record.
 */
export function isDemoLoginEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_AUTH_MODE === "credentials") return false;
  return process.env.NODE_ENV !== "production";
}

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
  /** The linked Doctor/Receptionist/Patient record id (scoping key for DOCTOR/RECEPTIONIST/PATIENT roles). */
  linkId?: string;
}

export interface Session {
  user: SessionUser;
}

function sign(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set — required for real login.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** `<userId>.<hmac>` — the value stored in the session cookie. */
export function signSessionToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** Verifies the HMAC and returns the userId, or null if tampered/invalid. */
function verifySessionToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const userId = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(userId);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

async function resolveRealUser(userId: string): Promise<SessionUser | null> {
  const account = await db.users.get(userId);
  if (!account || !account.isActive) return null;

  let branchId: string | undefined;
  let branchIds: string[] = [];

  if (account.role === "DOCTOR" && account.linkId) {
    const doctor = await db.doctors.get(account.linkId);
    branchIds = doctor?.branchIds ?? [];
    branchId = branchIds[0];
  } else if (account.role === "RECEPTIONIST" && account.linkId) {
    branchId = account.branchId;
    branchIds = branchId ? [branchId] : [];
  } else if (account.role === "ADMIN") {
    branchIds = (await db.branches.list()).map((b) => b.id);
  }

  return {
    id: account.id,
    fullName: account.fullName,
    email: account.email,
    role: account.role,
    organizationId: DEMO_ORG_ID,
    branchId,
    branchIds,
    linkId: account.linkId,
  };
}

/**
 * Resolve the current session, or null if unauthenticated.
 * `cache()` dedupes the lookup within a single server request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();

  const sessionToken = store.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    const userId = verifySessionToken(sessionToken);
    if (userId) {
      const user = await resolveRealUser(userId);
      if (user) return { user };
    }
  }

  // Dev-only fallback — see /dev-login. Refused outright once real
  // credentials are in use, so a stale cookie cannot grant a session.
  if (isDemoLoginEnabled()) {
    const demoRole = store.get(DEMO_ROLE_COOKIE)?.value as Role | undefined;
    if (demoRole) {
      const user = getDemoUserByRole(demoRole);
      if (user) return { user };
    }
  }

  return null;
});

/** Throwing variant for server components/actions that require a session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}
