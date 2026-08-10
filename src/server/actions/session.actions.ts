"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, DEMO_ROLE_COOKIE, signSessionToken, isDemoLoginEnabled } from "@/lib/session";
import { ROLE_HOME, type Role } from "@/lib/rbac";

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
  store.set(DEMO_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(ROLE_HOME[role]);
}

export async function signOut() {
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

  const { authenticate } = await import("@/lib/auth/credentials");
  const result = await authenticate(email, password);
  if (!result.ok) return { ok: false, message: result.message };

  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionToken(result.user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(ROLE_HOME[result.user.role]);
}
