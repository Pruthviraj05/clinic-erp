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
  /** `scrypt$<saltHex>$<hashHex>` */
  passwordHash: string;
  /** Links DOCTOR/RECEPTIONIST/PATIENT accounts to their domain records. */
  linkId?: string;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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
};
