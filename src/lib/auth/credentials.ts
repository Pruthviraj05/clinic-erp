import "server-only";
import { verifyPassword } from "@/server/demo/users-store";
import { db } from "@/server/repositories";
import type { UserAccount } from "@/server/demo/users-store";

/**
 * Credentials authentication — the real login. `/login` renders the
 * email/password form (see `appConfig.authMode`), which calls
 * `signInWithPassword` → `authenticate()` here, verifying against `db.users`.
 *
 * Production hardening still to add: rate limiting, lockout after N failed
 * attempts, OTP/2FA — tracked in docs/05-roadmap.md.
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: true; user: UserAccount } | { ok: false; message: string }> {
  const normalized = email.trim().toLowerCase();
  // Indexed lookup, not a full scan: loading every account (and every password
  // hash) into memory on each login attempt made login a DoS amplifier.
  const [user] = await db.users.find({ email: normalized }, { limit: 1 });
  if (!user || !user.isActive) {
    return { ok: false, message: "No active account found for that email." };
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return { ok: false, message: "Incorrect email or password." };
  }
  return { ok: true, user };
}
