"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  DEMO_ROLE_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  isDemoLoginEnabled,
  getSession,
} from "@/lib/session";
import { db } from "@/server/repositories";
import { ROLE_HOME, type Role } from "@/lib/rbac";

/** Shared cookie flags. `secure` keeps the cookie off plaintext HTTP. */
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/**
 * Dev fallback (see /dev-login): selecting a role sets the demo cookie and
 * opens that role's home. Guarded server-side as well as at the page — a
 * server action is a public endpoint, so hiding the UI is not enough.
 */
export async function signInAs(role: Role) {
  if (!isDemoLoginEnabled()) {
    return { ok: false, message: "Demo sign-in is disabled." };
  }
  const store = await cookies();
  store.set(DEMO_ROLE_COOKIE, role, { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_SECONDS });
  redirect(ROLE_HOME[role]);
}

/**
 * Sign out everywhere, not just in this browser: bumping `sessionVersion`
 * invalidates every token already issued for the account, so a copied cookie
 * stops working too. Deleting the cookie alone left it valid.
 */
export async function signOut() {
  const session = await getSession();
  if (session) {
    const account = await db.users.get(session.user.id);
    if (account) {
      await db.users.update(account.id, { sessionVersion: (account.sessionVersion ?? 1) + 1 });
    }
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(DEMO_ROLE_COOKIE);
  redirect("/login");
}

export interface SignInResult {
  ok: boolean;
  message?: string;
}

/**
 * Real email/password sign-in. Verifies against the users store (scrypt
 * hashes), then issues an HMAC-signed session cookie identifying that real
 * account — every subsequent request resolves the actual user (and their
 * linked doctor/receptionist/patient record) via `getSession()`.
 */
export async function signInWithPassword(
  _prev: SignInResult | null,
  formData: FormData,
): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "Enter your email and password." };

  // Per-IP budget on top of per-account lockout: lockout alone does not stop
  // one password being sprayed across many accounts.
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { checkLoginRateLimit, clearLoginRateLimit } = await import("@/lib/auth/rate-limit");
  const limit = checkLoginRateLimit(ip);
  if (!limit.allowed) {
    const mins = Math.ceil((limit.retryAfterSeconds ?? 60) / 60);
    return { ok: false, message: `Too many sign-in attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  const { authenticate } = await import("@/lib/auth/credentials");
  const result = await authenticate(email, password);
  if (!result.ok) return { ok: false, message: result.message };
  clearLoginRateLimit(ip);

  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionToken(result.user.id, result.user.sessionVersion ?? 1), {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  // Still on the issued/seed password — send them to change it first.
  redirect(result.user.mustChangePassword ? "/change-password" : ROLE_HOME[result.user.role]);
}
