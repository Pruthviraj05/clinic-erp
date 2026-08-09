"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, DEMO_ROLE_COOKIE, signSessionToken } from "@/lib/session";
import { ROLE_HOME, type Role } from "@/lib/rbac";

/**
 * Hidden dev fallback (see /dev-login, unlinked from the real login page):
 * selecting a role sets the demo cookie and opens that role's home. Does not
 * touch the real `users` collection — for quickly checking any screen.
 */
export async function signInAs(role: Role) {
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
