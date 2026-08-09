/**
 * Additional demo datasets used by the EMR, Masters, Notifications, Audit and
 * Reports modules. Kept separate from `data.ts` to keep each file readable.
 * Same principle: shapes mirror the Prisma models.
 */
import { doctors } from "./data";

// ---------------------------------------------------------------------------
// Medical records (EMR document uploads) — clean slate
// ---------------------------------------------------------------------------
export interface MedicalRecordItem {
  id: string;
  patientId: string;
  title: string;
  category: string;
  fileType: string;
  fileSize: string;
  recordedAt: string;
}

export const medicalRecords: MedicalRecordItem[] = [];

// ---------------------------------------------------------------------------
// Masters
// ---------------------------------------------------------------------------
export interface MasterRow {
  id: string;
  name: string;
  meta?: string;
  active: boolean;
}

export const departments: MasterRow[] = [
  { id: "dep_1", name: "Rheumatology", meta: "Joint Pain, Backpain Treatment", active: true },
];

export const specializations: MasterRow[] = [
  { id: "sp_1", name: "Rheumatology", active: true },
];

export const medicineCategories: MasterRow[] = [
  { id: "mc_1", name: "NSAID", active: true },
  { id: "mc_2", name: "DMARD", active: true },
  { id: "mc_3", name: "Biologic (DMARD)", active: true },
  { id: "mc_4", name: "Steroid", active: true },
  { id: "mc_5", name: "Gout Management", active: true },
  { id: "mc_6", name: "Bone Health", active: true },
  { id: "mc_7", name: "Muscle Relaxant", active: true },
  { id: "mc_8", name: "PPI", active: true },
  { id: "mc_9", name: "Analgesic", active: true },
  { id: "mc_10", name: "Supplement", active: true },
];

export const labTests: MasterRow[] = [
  { id: "lt_1", name: "Rheumatoid Factor (RA Factor)", active: true }, // PLACEHOLDER — set real price
  { id: "lt_2", name: "Anti-CCP Antibody", active: true }, // PLACEHOLDER — set real price
  { id: "lt_3", name: "ESR (Erythrocyte Sedimentation Rate)", active: true }, // PLACEHOLDER — set real price
  { id: "lt_4", name: "CRP (C-Reactive Protein)", active: true }, // PLACEHOLDER — set real price
  { id: "lt_5", name: "Serum Uric Acid", active: true }, // PLACEHOLDER — set real price
  { id: "lt_6", name: "ANA (Antinuclear Antibody)", active: true }, // PLACEHOLDER — set real price
  { id: "lt_7", name: "Vitamin D (25-OH)", active: true }, // PLACEHOLDER — set real price
  { id: "lt_8", name: "Serum Calcium", active: true }, // PLACEHOLDER — set real price
];

export const investigations: MasterRow[] = [
  { id: "iv_1", name: "X-Ray (Joint)", active: true },
  { id: "iv_2", name: "Ultrasound (Joint)", active: true },
  { id: "iv_3", name: "MRI (Spine/Joint)", active: true },
  { id: "iv_4", name: "Bone Densitometry (DEXA Scan)", active: true },
];

// PLACEHOLDER — add real medicine suppliers via Settings once confirmed.
export const suppliers: MasterRow[] = [];

export const taxRates: MasterRow[] = [
  { id: "tx_1", name: "GST 5%", meta: "5.00%", active: true },
  { id: "tx_2", name: "GST 12%", meta: "12.00%", active: true },
  { id: "tx_3", name: "GST 18%", meta: "18.00%", active: true },
];

export const consultationFees: MasterRow[] = doctors.map((d) => ({
  id: `fee_${d.id}`,
  name: d.fullName,
  meta: `₹${d.consultationFee} · ${d.specialization ?? ""}`,
  active: d.isActive,
}));

export interface HolidayRow {
  id: string;
  name: string;
  date: string;
  branch: string;
}
// PLACEHOLDER — add the clinic's actual holiday calendar via Settings.
export const holidays: HolidayRow[] = [];

export const MASTER_GROUPS = [
  { key: "departments", label: "Departments", rows: departments },
  { key: "specializations", label: "Specializations", rows: specializations },
  { key: "medicine-categories", label: "Medicine Categories", rows: medicineCategories },
  { key: "lab-tests", label: "Lab Tests", rows: labTests },
  { key: "investigations", label: "Investigations", rows: investigations },
  { key: "suppliers", label: "Suppliers", rows: suppliers },
  { key: "tax-rates", label: "Tax Rates", rows: taxRates },
  { key: "consultation-fees", label: "Consultation Fees", rows: consultationFees },
] as const;

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
export interface AuditRow {
  id: string;
  actor: string;
  role: string;
  action: string;
  entity: string;
  summary: string;
  at: string;
}

let auditSeq = 100;

/**
 * Append a real audit entry. Every mutating server action calls this so the
 * Audit Log reflects actual activity, not just seed rows.
 */
export async function logAudit(entry: {
  actor: string;
  role: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "EXPORT" | "PRINT" | "SIGN";
  entity: string;
  summary: string;
}): Promise<void> {
  const { db } = await import("@/server/repositories");
  await db.auditLog.insert({
    id: `au_${auditSeq++}`,
    ...entry,
    at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Consent forms (e-signature) — clean slate
// ---------------------------------------------------------------------------
export interface ConsentFormItem {
  id: string;
  patientId: string;
  patientName: string;
  /** Doctor the consent concerns — assigned by reception, sees & edits the form. */
  doctorId?: string;
  doctorName?: string;
  title: string;
  body: string;
  /** Basic info filled by reception: procedure details, relevant history, notes. */
  details?: string;
  status: "PENDING" | "SIGNED" | "DECLINED";
  signatureDataUrl?: string;
  signedAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export const consentForms: ConsentFormItem[] = [];

// ---------------------------------------------------------------------------
// Insurance / TPA
// ---------------------------------------------------------------------------
export interface InsurancePlanItem {
  id: string;
  provider: string;
  planName: string;
  tpa: string;
  active: boolean;
}
// PLACEHOLDER — add the insurance providers/TPAs the clinic actually accepts.
export const insurancePlans: InsurancePlanItem[] = [];

export interface PatientInsuranceItem {
  id: string;
  patientId: string;
  patientName: string;
  provider: string;
  policyNumber: string;
  validTo: string;
  coverage: number;
}
export const patientInsurances: PatientInsuranceItem[] = [];

// ---------------------------------------------------------------------------
// Doctor leave & roster
// ---------------------------------------------------------------------------
export interface LeaveItem {
  id: string;
  doctorName: string;
  from: string;
  to: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}
export const doctorLeaves: LeaveItem[] = [];

/** Weekly roster: for each weekday, the working window for the doctor. */
// PLACEHOLDER — confirm Dr. Bhosikar's real weekly consulting hours.
export const weeklyRoster = [
  { day: "Monday", hours: "TBD", branch: "Dr. Bhosikar's Rheumatology Clinic" },
  { day: "Tuesday", hours: "TBD", branch: "Dr. Bhosikar's Rheumatology Clinic" },
  { day: "Wednesday", hours: "TBD", branch: "Dr. Bhosikar's Rheumatology Clinic" },
  { day: "Thursday", hours: "TBD", branch: "Dr. Bhosikar's Rheumatology Clinic" },
  { day: "Friday", hours: "TBD", branch: "Dr. Bhosikar's Rheumatology Clinic" },
  { day: "Saturday", hours: "TBD", branch: "Dr. Bhosikar's Rheumatology Clinic" },
  { day: "Sunday", hours: "TBD", branch: "Dr. Bhosikar's Rheumatology Clinic" },
];
