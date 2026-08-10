import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Role } from "@/lib/rbac";

/**
 * User account shape + password hashing. Real accounts live in the `users`
 * collection (via `db.users`, see `src/server/repositories`) — this module
 * holds the pure crypto helpers plus the one seed record every environment
 * starts with.
 */
export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  /** `scrypt$N$r$p$<saltHex>$<hashHex>` (legacy: `scrypt$<saltHex>$<hashHex>`) */
  passwordHash: string;
  /** Links DOCTOR/RECEPTIONIST/PATIENT accounts to their domain records. */
  linkId?: string;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  /** Consecutive failed sign-ins; reset on success. */
  failedAttempts?: number;
  /** ISO timestamp until which sign-in is refused after repeated failures. */
  lockedUntil?: string;
  /** Bumped on sign-out / deactivation / password change to kill live sessions. */
  sessionVersion?: number;
  /** Set on seeded and auto-created accounts — forces a change at first sign-in. */
  mustChangePassword?: boolean;
  passwordChangedAt?: string;
}

/**
 * scrypt parameters. OWASP's 2024 floor is N=2^17, r=8, p=1; Node's default is
 * N=2^14, which is where the original hashes were made. The cost is written
 * INTO the stored string so it can be raised later without invalidating
 * existing hashes — legacy hashes keep verifying against the old cost and are
 * transparently re-hashed on the next successful sign-in.
 */
// OWASP's memory-constrained profile (N=2^16, r=8, p=2). Measured on this
// codebase it costs the same ~200 ms as their primary N=2^17/p=1 profile but
// needs 64 MB instead of 128 MB — which matters because this runs inside a
// serverless function with a fixed memory ceiling. Both are far above the
// Node default (N=2^14, ~25 ms) the original hashes used.
const SCRYPT_N = 65_536; // 2^16
const SCRYPT_R = 8;
const SCRYPT_P = 2;
const SCRYPT_KEYLEN = 32;
// scrypt needs roughly 128 * N * r bytes; give it headroom or it throws.
const SCRYPT_MAXMEM = 256 * 1024 * 1024;
const LEGACY_N = 16_384;

function derive(password: string, salt: Buffer, N: number, r: number, p: number): Buffer {
  return scryptSync(password, salt, SCRYPT_KEYLEN, { N, r, p, maxmem: SCRYPT_MAXMEM });
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = derive(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function parseHash(stored: string): { N: number; r: number; p: number; salt: Buffer; hash: Buffer } | null {
  const parts = stored.split("$");
  if (parts[0] !== "scrypt") return null;

  // Current: scrypt$N$r$p$salt$hash
  if (parts.length === 6) {
    const [, n, r, p, saltHex, hashHex] = parts;
    if (!saltHex || !hashHex) return null;
    return {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      salt: Buffer.from(saltHex, "hex"),
      hash: Buffer.from(hashHex, "hex"),
    };
  }
  // Legacy: scrypt$salt$hash — Node defaults.
  if (parts.length === 3) {
    const [, saltHex, hashHex] = parts;
    if (!saltHex || !hashHex) return null;
    return {
      N: LEGACY_N,
      r: 8,
      p: 1,
      salt: Buffer.from(saltHex, "hex"),
      hash: Buffer.from(hashHex, "hex"),
    };
  }
  return null;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const { N, r, p, salt, hash } = parsed;
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  try {
    const actual = derive(password, salt, N, r, p);
    return actual.length === hash.length && timingSafeEqual(actual, hash);
  } catch {
    return false;
  }
}

/** True when the hash was made with weaker parameters than we now use. */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored);
  if (!parsed) return true;
  return parsed.N < SCRYPT_N || parsed.r < SCRYPT_R || parsed.p < SCRYPT_P;
}

/**
 * The one account every deployment starts with. Precomputed offline (same
 * reasoning as before: scryptSync is deliberately slow — never compute seed
 * hashes at module/cold-start time). Password: `Test@12345` — change it after
 * first login.
 */
export const ADMIN_SEED_USER: UserAccount = {
  id: "usr_admin",
  fullName: "Admin",
  email: "admin@gmail.com",
  role: "ADMIN",
  passwordHash: "scrypt$7932b2e116b076a54f452848eaabd585$06000d0d587e8c9f8e4837807bfb98b9771cac636d018468d93212910f423e64",
  isActive: true,
  createdAt: new Date(2026, 0, 1).toISOString(),
  // This password is published in the README and .env.example, so it is a
  // shared secret from the moment the app is deployed. Force a change before
  // the account can be used for anything.
  mustChangePassword: true,
  sessionVersion: 1,
};
