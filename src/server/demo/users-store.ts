import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Role } from "@/lib/rbac";

/**
 * User accounts with password hashes (demo store).
 *
 * AUTH-READY, NOT ACTIVE: `appConfig.authMode` stays "demo" (role switcher).
 * When switched to "credentials", the login form authenticates against these
 * records via `src/lib/auth/credentials.ts` — no other code changes.
 * MongoDB: `users` collection; hashes are scrypt with per-user salt.
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
 * Deterministic seed hash so demo data stays stable across restarts.
 * Default password for every seeded account: `Clinic@123`.
 */
function seedHash(email: string): string {
  const salt = createHash("sha256").update(email).digest().subarray(0, 16);
  const hash = scryptSync("Clinic@123", salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

let seq = 100;
const now = () => new Date().toISOString();

export const users: UserAccount[] = [
  { id: "usr_admin_neha", fullName: "Neha Sharma", email: "admin@clinicore.app", role: "ADMIN", passwordHash: seedHash("admin@clinicore.app"), isActive: true, createdAt: now() },
  { id: "usr_doc_mehta", fullName: "Dr. Ananya Mehta", email: "ananya.mehta@clinicore.app", role: "DOCTOR", passwordHash: seedHash("ananya.mehta@clinicore.app"), linkId: "doc_mehta", isActive: true, createdAt: now() },
  { id: "usr_doc_rao", fullName: "Dr. Vikram Rao", email: "vikram.rao@clinicore.app", role: "DOCTOR", passwordHash: seedHash("vikram.rao@clinicore.app"), linkId: "doc_rao", isActive: true, createdAt: now() },
  { id: "usr_rec_sana", fullName: "Sana Kapoor", email: "sana.kapoor@clinicore.app", role: "RECEPTIONIST", passwordHash: seedHash("sana.kapoor@clinicore.app"), linkId: "rec_sana", branchId: "br_central", isActive: true, createdAt: now() },
  { id: "usr_pat_arjun", fullName: "Arjun Sharma", email: "arjun.sharma@gmail.com", role: "PATIENT", passwordHash: seedHash("arjun.sharma@gmail.com"), linkId: "pat_arjun", isActive: true, createdAt: now() },
];

export function findUserByEmail(email: string): UserAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized);
}

export function addUser(input: Omit<UserAccount, "id" | "createdAt">): UserAccount {
  const user: UserAccount = { id: `usr_${seq++}`, createdAt: now(), ...input };
  users.push(user);
  return user;
}
