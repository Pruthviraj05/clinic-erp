import "server-only";
import { hashPassword, needsRehash, verifyPassword } from "@/server/demo/users-store";
import { db } from "@/server/repositories";
import type { UserAccount } from "@/server/demo/users-store";

/**
 * Credentials authentication — the real login. `/login` renders the
 * email/password form (see `appConfig.authMode`), which calls
 * `signInWithPassword` → `authenticate()` here, verifying against `db.users`.
 */

/** Failures tolerated before the account is temporarily locked. */
const MAX_ATTEMPTS = 5;
/** How long a locked account stays locked. */
const LOCKOUT_MINUTES = 15;

export type AuthResult =
  | { ok: true; user: UserAccount }
  | { ok: false; message: string; lockedUntil?: string };

/**
 * Every failure path returns this one message. Distinguishing "no such
 * account" from "wrong password" hands an attacker a free way to enumerate
 * which emails are real.
 */
const GENERIC_FAILURE = "Incorrect email or password.";

export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();
  // Indexed lookup, not a full scan: loading every account (and every password
  // hash) into memory on each login attempt made login a DoS amplifier.
  const [user] = await db.users.find({ email: normalized }, { limit: 1 });

  if (!user || !user.isActive) {
    return { ok: false, message: GENERIC_FAILURE };
  }

  // Locked out? Refuse before doing the (deliberately slow) hash work, so a
  // locked account cannot be used to burn CPU either.
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const mins = Math.max(1, Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60_000));
    return {
      ok: false,
      message: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
      lockedUntil: user.lockedUntil,
    };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    const failedAttempts = (user.failedAttempts ?? 0) + 1;
    const patch: Partial<UserAccount> = { failedAttempts };
    if (failedAttempts >= MAX_ATTEMPTS) {
      patch.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
      patch.failedAttempts = 0;
    }
    await db.users.update(user.id, patch);

    if (patch.lockedUntil) {
      return {
        ok: false,
        message: `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`,
        lockedUntil: patch.lockedUntil,
      };
    }
    return { ok: false, message: GENERIC_FAILURE };
  }

  // Success — clear the failure counters, and transparently upgrade the hash
  // if it was made with weaker scrypt parameters than we now use.
  const patch: Partial<UserAccount> = { failedAttempts: 0, lockedUntil: undefined };
  if (needsRehash(user.passwordHash)) {
    patch.passwordHash = hashPassword(password);
  }
  await db.users.update(user.id, patch);

  return { ok: true, user: { ...user, ...patch } };
}
