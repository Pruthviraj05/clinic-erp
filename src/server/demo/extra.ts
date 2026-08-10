/**
 * Additional demo datasets used by the EMR, Masters, Notifications, Audit and
 * Reports modules. Kept separate from `data.ts` to keep each file readable.
 * Same principle: shapes mirror the Prisma models.
 */
import { daysFromNow, doctors } from "./data";

// ---------------------------------------------------------------------------
// Medical records (EMR document uploads) — sample records for the 3 sample
// patients. No `fileDataUrl`: these are metadata-only demo rows.
// ---------------------------------------------------------------------------
export interface MedicalRecordItem {
  id: string;
  patientId: string;
  title: string;
  category: string;
  fileType: string;
  fileSize: string;
  recordedAt: string;
  /** Optional context — reason for the record, findings, etc. */
  notes?: string;
  /** Optional attached file as a base64 data URL (no object-storage backend yet). */
  fileDataUrl?: string;
  /** Who added it and from which role, e.g. "Dr. Abhijeet Bhosikar (Doctor)" or "Sunita Deshmukh (Patient)". */
  addedBy?: string;
}

export const medicalRecords: MedicalRecordItem[] = [
  {
    id: "mr_seed_1",
    patientId: "pat_seed_1",
    title: "RA Factor & Anti-CCP Report",
    category: "Lab Report",
    fileType: "PDF",
    fileSize: "412 KB",
    recordedAt: daysFromNow(-32, 9, 30),
    notes: "RA Factor 78 IU/mL (high), Anti-CCP positive. Supports the rheumatoid arthritis diagnosis; ESR and CRP also raised.",
    addedBy: "Dr. Abhijeet Bhosikar (Doctor)",
  },
  {
    id: "mr_seed_2",
    patientId: "pat_seed_2",
    title: "Serum Uric Acid Report",
    category: "Lab Report",
    fileType: "PDF",
    fileSize: "188 KB",
    recordedAt: daysFromNow(-11, 8, 45),
    notes: "Serum uric acid 8.9 mg/dL during the acute attack. Renal function within normal limits. Repeat after the flare settles.",
    addedBy: "Ramesh Kulkarni (Patient)",
  },
  {
    id: "mr_seed_3",
    patientId: "pat_seed_3",
    title: "X-Ray LS Spine (AP & Lateral)",
    category: "Radiology",
    fileType: "JPG",
    fileSize: "1.4 MB",
    recordedAt: daysFromNow(-44, 12, 0),
    notes: "Mild reduction of L4-L5 disc space. No listhesis or fracture. Consistent with mechanical low back pain.",
    addedBy: "Dr. Abhijeet Bhosikar (Doctor)",
  },
];

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

export const suppliers: MasterRow[] = [
  { id: "sup_1", name: "Sahyadri Pharma Distributors", meta: "Pimpri, Pune · +91 20 2745 8890 · GSTIN 27AABCS1429P1Z6", active: true },
  { id: "sup_2", name: "Deccan Medico Agencies", meta: "Shivajinagar, Pune · +91 20 2553 1177 · GSTIN 27AACCD8812K1ZR", active: true },
  { id: "sup_3", name: "Nirmal Healthcare Supplies", meta: "Chinchwad, Pune · +91 98220 34567 · GSTIN 27AAECN5590M1ZQ", active: true },
];

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
const CLINIC_NAME = "Dr. Bhosikar's Rheumatology Clinic";

export const holidays: HolidayRow[] = [
  { id: "hol_1", name: "Ganesh Chaturthi", date: daysFromNow(18), branch: CLINIC_NAME },
  { id: "hol_2", name: "Gandhi Jayanti", date: daysFromNow(53), branch: CLINIC_NAME },
  { id: "hol_3", name: "Diwali — Laxmi Pujan", date: daysFromNow(82), branch: CLINIC_NAME },
];

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

export const consentForms: ConsentFormItem[] = [
  {
    id: "cf_seed_1",
    patientId: "pat_seed_1",
    patientName: "Sunita Deshmukh",
    doctorId: "doc_bhosikar",
    doctorName: "Dr. Abhijeet Bhosikar",
    title: "Consent for DMARD Therapy (Methotrexate)",
    body:
      "I consent to starting disease-modifying therapy with Methotrexate for rheumatoid arthritis. " +
      "The doctor has explained the expected benefit, the weekly (not daily) dosing schedule, and the need " +
      "for Folic Acid supplementation. I understand possible side effects include nausea, mouth ulcers, hair " +
      "thinning, and effects on the liver and blood counts, and that regular CBC and liver function monitoring " +
      "is required. I have been advised to avoid alcohol and to inform the clinic immediately if I develop " +
      "fever, unusual bleeding, breathlessness or persistent cough. I understand this medicine must not be " +
      "taken during pregnancy.",
    details: "Starting dose 7.5 mg once weekly. Baseline CBC, LFT, ESR and CRP done. Monitoring bloods every 4 weeks for the first 3 months.",
    status: "PENDING",
    createdBy: "Priya Kale",
    updatedAt: daysFromNow(-3, 12, 15),
  },
  {
    id: "cf_seed_2",
    patientId: "pat_seed_2",
    patientName: "Ramesh Kulkarni",
    doctorId: "doc_bhosikar",
    doctorName: "Dr. Abhijeet Bhosikar",
    title: "Consent for Intra-articular Steroid Injection",
    body:
      "I consent to an intra-articular corticosteroid injection into the affected joint for relief of acute " +
      "inflammatory pain. The procedure, its purpose and alternatives have been explained to me. I understand " +
      "the possible risks include a temporary flare of pain for 24–48 hours, skin thinning or lightening at the " +
      "injection site, a short-term rise in blood sugar, and a small risk of joint infection. I confirm I have " +
      "no active infection and have disclosed all my current medications and allergies.",
    details: "Right first metatarsophalangeal joint. No anticoagulants. No known drug allergies. Procedure performed under aseptic precautions.",
    status: "SIGNED",
    signedAt: daysFromNow(-10, 16, 40),
    createdBy: "Priya Kale",
    updatedAt: daysFromNow(-10, 16, 40),
  },
  {
    id: "cf_seed_3",
    patientId: "pat_seed_3",
    patientName: "Anjali Joshi",
    doctorId: "doc_bhosikar",
    doctorName: "Dr. Abhijeet Bhosikar",
    title: "Consent for Radiological Investigation (X-Ray LS Spine)",
    body:
      "I consent to an X-ray of the lumbosacral spine as advised for the evaluation of my low back pain. " +
      "The reason for the test has been explained to me, along with the fact that it involves a small dose of " +
      "ionising radiation. I confirm that I am not pregnant and am not likely to be pregnant. I understand the " +
      "report will be shared with my treating doctor and stored in my clinic record.",
    details: "AP and lateral views. Patient reports sulfa drug allergy — no contrast involved in this study.",
    status: "PENDING",
    createdBy: "Priya Kale",
    updatedAt: daysFromNow(-2, 10, 30),
  },
];

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
export const insurancePlans: InsurancePlanItem[] = [
  { id: "ins_1", provider: "Star Health & Allied Insurance", planName: "Family Health Optima", tpa: "Star Health (in-house TPA)", active: true },
  { id: "ins_2", provider: "HDFC ERGO General Insurance", planName: "Optima Restore", tpa: "Medi Assist India TPA", active: true },
  { id: "ins_3", provider: "Niva Bupa Health Insurance", planName: "ReAssure 2.0", tpa: "Niva Bupa (in-house TPA)", active: true },
];

export interface PatientInsuranceItem {
  id: string;
  patientId: string;
  patientName: string;
  provider: string;
  policyNumber: string;
  validTo: string;
  coverage: number;
}
export const patientInsurances: PatientInsuranceItem[] = [
  {
    id: "pins_1",
    patientId: "pat_seed_1",
    patientName: "Sunita Deshmukh",
    provider: "Star Health & Allied Insurance",
    policyNumber: "SHAI/2024/PN/0084512",
    validTo: daysFromNow(210),
    coverage: 500000,
  },
  {
    id: "pins_2",
    patientId: "pat_seed_2",
    patientName: "Ramesh Kulkarni",
    provider: "HDFC ERGO General Insurance",
    policyNumber: "HDE/OR/2025/1129034",
    validTo: daysFromNow(120),
    coverage: 300000,
  },
];

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
export const doctorLeaves: LeaveItem[] = [
  {
    id: "lv_seed_1",
    doctorName: "Dr. Abhijeet Bhosikar",
    from: daysFromNow(-21),
    to: daysFromNow(-19),
    reason: "Indian Rheumatology Association CME, Mumbai",
    status: "APPROVED",
  },
  {
    id: "lv_seed_2",
    doctorName: "Dr. Abhijeet Bhosikar",
    from: daysFromNow(26),
    to: daysFromNow(28),
    reason: "Personal leave — family function",
    status: "PENDING",
  },
];

const MORNING_EVENING = "10:00 AM – 1:00 PM, 5:00 PM – 8:00 PM";

/** Weekly roster: for each weekday, the working window for the doctor. */
// INDICATIVE sample hours — replace via Settings once the clinic confirms
// Dr. Bhosikar's real weekly consulting schedule.
export const weeklyRoster = [
  { day: "Monday", hours: MORNING_EVENING, branch: CLINIC_NAME },
  { day: "Tuesday", hours: MORNING_EVENING, branch: CLINIC_NAME },
  { day: "Wednesday", hours: MORNING_EVENING, branch: CLINIC_NAME },
  { day: "Thursday", hours: MORNING_EVENING, branch: CLINIC_NAME },
  { day: "Friday", hours: MORNING_EVENING, branch: CLINIC_NAME },
  { day: "Saturday", hours: "10:00 AM – 2:00 PM", branch: CLINIC_NAME },
  { day: "Sunday", hours: "Closed", branch: CLINIC_NAME },
];
