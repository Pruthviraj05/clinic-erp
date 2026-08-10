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
  /** True while the account still has its issued/seed password. */
  mustChangePassword?: boolean;
}

export interface Session {
  user: SessionUser;
}

function sign(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set — required for real login.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** How long a session stays valid before the user must sign in again. */
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

/**
 * `<userId>.<issuedAt>.<sessionVersion>.<hmac>` — the value in the cookie.
 *
 * The payload carries an issue time and the account's session version so a
 * session can actually be ended. Previously the token was a pure function of
 * the user id: it never expired, and signing out only deleted the client-side
 * cookie — a copied cookie stayed valid forever.
 */
export function signSessionToken(userId: string, sessionVersion = 1): string {
  const payload = `${userId}.${Math.floor(Date.now() / 1000)}.${sessionVersion}`;
  return `${payload}.${sign(payload)}`;
}

interface TokenClaims {
  userId: string;
  issuedAt: number;
  sessionVersion: number;
}

/** Verifies the HMAC and expiry, returning the claims or null. */
function verifySessionToken(token: string): TokenClaims | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(payload);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const parts = payload.split(".");
  if (parts.length !== 3) return null;
  const [userId, issuedRaw, versionRaw] = parts;
  const issuedAt = Number(issuedRaw);
  const sessionVersion = Number(versionRaw);
  if (!userId || !Number.isFinite(issuedAt) || !Number.isFinite(sessionVersion)) return null;

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
  // Reject expired tokens, and tokens issued in the future (clock tampering).
  if (ageSeconds > SESSION_MAX_AGE_SECONDS || ageSeconds < -60) return null;

  return { userId, issuedAt, sessionVersion };
}

async function resolveRealUser(claims: TokenClaims): Promise<SessionUser | null> {
  const account = await db.users.get(claims.userId);
  if (!account || !account.isActive) return null;
  // Signing out, deactivating an account or changing a password bumps this,
  // which instantly invalidates every token issued before that point.
  if ((account.sessionVersion ?? 1) !== claims.sessionVersion) return null;

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
    mustChangePassword: account.mustChangePassword ?? false,
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
    const claims = verifySessionToken(sessionToken);
    if (claims) {
      const user = await resolveRealUser(claims);
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
