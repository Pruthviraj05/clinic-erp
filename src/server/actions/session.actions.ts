"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";
import { ROLE_HOME, type Role } from "@/lib/rbac";

/**
 * TEMPORARY auth: selecting a role sets a cookie and opens that role's home.
 * When real authentication is added, replace the cookie write with a verified
 * sign-in — every other consumer reads through `getSession()` and is unaffected.
 */
export async function signInAs(role: Role) {
  const store = await cookies();
  store.set(SESSION_COOKIE, role, {
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
  redirect("/login");
}

export interface SignInResult {
  ok: boolean;
  message?: string;
}

/**
 * Email/password sign-in — READY BUT NOT ACTIVE (`appConfig.authMode` is
 * "demo"). The /login page renders the password form only in credentials
 * mode. Verifies against the users store (scrypt hashes) and then issues the
 * same session cookie the rest of the app already consumes.
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
  store.set(SESSION_COOKIE, result.user.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(ROLE_HOME[result.user.role]);
}
