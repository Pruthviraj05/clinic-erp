import "server-only";
import type {
  Appointment,
  Branch,
  Doctor,
  Invoice,
  Patient,
  Prescription,
  Receptionist,
} from "@/types/domain";
import type { MasterRow, MedicalRecordItem } from "@/server/demo/extra";

/**
 * Storage port — the seam between the write/read facades (server actions +
 * services) and whatever persistence backs them.
 *
 * Today the only adapter is the in-memory demo store. When MongoDB lands,
 * implement this same interface over the `mongodb` driver (or Mongoose) and
 * switch the export in `index.ts` — no action, service or UI code changes.
 * See README.md in this folder for the mapping guide.
 */

export interface EntityStore<T extends { id: string }> {
  list(filter?: (row: T) => boolean): Promise<T[]>;
  get(id: string): Promise<T | null>;
  insert(row: T): Promise<T>;
  /** Shallow-merges `patch`; returns the updated row or null if not found. */
  update(id: string, patch: Partial<T>): Promise<T | null>;
  /** Hard-removes the row. Prefer `update({ isActive: false })` for aggregates. */
  remove(id: string): Promise<boolean>;
}

export interface StoragePort {
  patients: EntityStore<Patient>;
  appointments: EntityStore<Appointment>;
  prescriptions: EntityStore<Prescription>;
  invoices: EntityStore<Invoice>;
  branches: EntityStore<Branch>;
  doctors: EntityStore<Doctor>;
  receptionists: EntityStore<Receptionist>;
  medicalRecords: EntityStore<MedicalRecordItem>;
  /** Masters keyed by group ("departments", "lab-tests", …). */
  masters: Record<string, EntityStore<MasterRow>>;
}
