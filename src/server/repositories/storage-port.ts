import "server-only";
import type {
  Appointment,
  Branch,
  Doctor,
  Invoice,
  Medicine,
  Patient,
  Prescription,
  Receptionist,
  StockMovementItem,
} from "@/types/domain";
import type {
  AuditRow,
  ConsentFormItem,
  MasterRow,
  MedicalRecordItem,
} from "@/server/demo/extra";
import type { RxTemplate } from "@/server/demo/template-store";
import type { RxDesign } from "@/server/demo/rx-design-store";
import type { DiseaseGroup } from "@/server/demo/disease-store";
import type { UserAccount } from "@/server/demo/users-store";
import type { NotificationItem } from "@/types/domain";
import type { PrescriptionTemplate } from "@/server/demo/settings-store";

/**
 * Storage port — the seam between the write/read facades (server actions +
 * services) and whatever persistence backs them.
 *
 * Two adapters implement this: the in-memory demo store (default) and the
 * MongoDB adapter (`mongodb-adapter.ts`, active when
 * `appConfig.dataMode === "mongodb"`). Services/actions call ONLY through
 * `db` (exported from `./index`) — never the raw demo arrays — so the
 * backend is swappable without touching call sites.
 *
 * Scope note: the core clinical + business entities below are on this port.
 * Peripheral modules (insurance/TPA, leave/roster, a few dashboard filler
 * numbers) still read demo arrays directly and are not yet persisted — see
 * docs/05-roadmap.md for the reasoning and what's deferred.
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

/** Single mutable document (no id) — e.g. the clinic's prescription template. */
export interface SingletonStore<T> {
  get(): Promise<T>;
  set(value: T): Promise<T>;
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
  medicines: EntityStore<Medicine>;
  stockMovements: EntityStore<StockMovementItem>;
  notifications: EntityStore<NotificationItem>;
  consentForms: EntityStore<ConsentFormItem>;
  /** Append-only: insert/list only, no update/remove call sites. */
  auditLog: EntityStore<AuditRow>;
  users: EntityStore<UserAccount>;
  rxTemplates: EntityStore<RxTemplate>;
  rxDesigns: EntityStore<RxDesign & { id: string }>;
  diseaseGroups: EntityStore<DiseaseGroup>;
  /** Masters keyed by group ("departments", "lab-tests", …). */
  masters: Record<string, EntityStore<MasterRow>>;
  /** The one clinic-wide prescription header/footer/QR/vitals template. */
  settings: SingletonStore<PrescriptionTemplate>;
}
