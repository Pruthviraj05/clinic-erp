import "server-only";
import { findUserByEmail, verifyPassword, type UserAccount } from "@/server/demo/users-store";

/**
 * Credentials authentication — READY BUT NOT ACTIVE.
 *
 * `appConfig.authMode` is "demo" (role-switch login). Set
 * `NEXT_PUBLIC_AUTH_MODE=credentials` to render the email/password form on
 * /login, which calls `signInWithPassword` → `authenticate()` here. The
 * session cookie contract is unchanged, so nothing else moves.
 *
 * Production hardening on activation: signed session tokens (JWT/iron-session)
 * instead of the role cookie, rate limiting, lockout after N failures, OTP.
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: true; user: UserAccount } | { ok: false; message: string }> {
  const user = findUserByEmail(email);
  if (!user || !user.isActive) {
    return { ok: false, message: "No active account found for that email." };
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return { ok: false, message: "Incorrect email or password." };
  }
  return { ok: true, user };
}
