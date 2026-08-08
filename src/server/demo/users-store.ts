import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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

let seq = 100;
const now = () => new Date().toISOString();

/**
 * Precomputed scrypt hashes for the seed accounts (password `Clinic@123` for
 * all of them). Computed once offline with the same algorithm `hashPassword`
 * uses (deterministic salt = sha256(email).slice(0,16), for reproducibility)
 * and hardcoded here as literals.
 *
 * Why: scryptSync is deliberately CPU-heavy (~50-150ms per call). Running it
 * 5x inside a module-scope array initializer meant every cold start of any
 * serverless function that imports this module (the admin users page, the
 * admin-users actions, credentials auth) paid 250-500ms of pure blocking CPU
 * before serving a single byte. Seed data must be static, not computed.
 */
const SEED_HASHES: Record<string, string> = {
  "admin@clinicore.app": "scrypt$080d6d2b41d36b08ad1301a5d2b02a05$b1d13edc86f81cf42f87c6229c0ccf97a5ba0e8c6022151788132b690b0647d9",
  "ananya.mehta@clinicore.app": "scrypt$4020d93ac0ce5c37632b695985f1cd5a$838ccf9fb936d545f1822a9de5a72689c387a7bb0dc2df98b63dd457ffa4e6d6",
  "vikram.rao@clinicore.app": "scrypt$912a3ee7feb802b65f261f933ef5932d$bbb233edf54edb436de20f97348371d67b4d898462359d886eb0e76596d06c1c",
  "sana.kapoor@clinicore.app": "scrypt$b53026c1f22aae587d8e70bde8c71b7f$5d77bc8b2c5325648178de4f8d8d0b06c9ff0a4feba5dae041b185c80333cfce",
  "arjun.sharma@gmail.com": "scrypt$781a5ead54b4b9fdf37607801f96a1c8$9f4279d5276f9dabf7f7cbdb80fab98e0022c987a7b46dc9c53706c3ccd6f5fd",
};

/** Every seeded account's password is `Clinic@123`. */
export const users: UserAccount[] = [
  { id: "usr_admin_neha", fullName: "Neha Sharma", email: "admin@clinicore.app", role: "ADMIN", passwordHash: SEED_HASHES["admin@clinicore.app"], isActive: true, createdAt: now() },
  { id: "usr_doc_mehta", fullName: "Dr. Ananya Mehta", email: "ananya.mehta@clinicore.app", role: "DOCTOR", passwordHash: SEED_HASHES["ananya.mehta@clinicore.app"], linkId: "doc_mehta", isActive: true, createdAt: now() },
  { id: "usr_doc_rao", fullName: "Dr. Vikram Rao", email: "vikram.rao@clinicore.app", role: "DOCTOR", passwordHash: SEED_HASHES["vikram.rao@clinicore.app"], linkId: "doc_rao", isActive: true, createdAt: now() },
  { id: "usr_rec_sana", fullName: "Sana Kapoor", email: "sana.kapoor@clinicore.app", role: "RECEPTIONIST", passwordHash: SEED_HASHES["sana.kapoor@clinicore.app"], linkId: "rec_sana", branchId: "br_central", isActive: true, createdAt: now() },
  { id: "usr_pat_arjun", fullName: "Arjun Sharma", email: "arjun.sharma@gmail.com", role: "PATIENT", passwordHash: SEED_HASHES["arjun.sharma@gmail.com"], linkId: "pat_arjun", isActive: true, createdAt: now() },
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
