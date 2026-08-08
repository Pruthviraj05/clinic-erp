/**
 * Additional demo datasets used by the EMR, Masters, Notifications, Audit and
 * Reports modules. Kept separate from `data.ts` to keep each file readable.
 * Same principle: shapes mirror the Prisma models.
 */
import { branches, doctors, medicines } from "./data";

function daysFromNow(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Medical records (EMR document uploads)
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

export const medicalRecords: MedicalRecordItem[] = [
  { id: "rec_1", patientId: "pat_arjun", title: "CBC Blood Report", category: "Lab Report", fileType: "PDF", fileSize: "248 KB", recordedAt: daysFromNow(-12) },
  { id: "rec_2", patientId: "pat_arjun", title: "Facial imaging — pre-treatment", category: "Image", fileType: "JPG", fileSize: "1.4 MB", recordedAt: daysFromNow(-40) },
  { id: "rec_3", patientId: "pat_kabir", title: "HbA1c Report", category: "Lab Report", fileType: "PDF", fileSize: "196 KB", recordedAt: daysFromNow(-1) },
  { id: "rec_4", patientId: "pat_kabir", title: "ECG Report", category: "Cardiology", fileType: "PDF", fileSize: "512 KB", recordedAt: daysFromNow(-60) },
  { id: "rec_5", patientId: "pat_diya", title: "Thyroid Profile", category: "Lab Report", fileType: "PDF", fileSize: "180 KB", recordedAt: daysFromNow(-3) },
  { id: "rec_6", patientId: "pat_rohan", title: "Knee X-Ray", category: "Radiology", fileType: "PNG", fileSize: "2.1 MB", recordedAt: daysFromNow(-7) },
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
  { id: "dep_1", name: "Skin & Aesthetics", meta: "Dermatology", active: true },
  { id: "dep_2", name: "General Medicine", meta: "Internal Medicine", active: true },
  { id: "dep_3", name: "Child Care", meta: "Pediatrics", active: true },
  { id: "dep_4", name: "Bone & Joint", meta: "Orthopedics", active: true },
  { id: "dep_5", name: "Women's Health", meta: "Gynecology", active: true },
];

export const specializations: MasterRow[] = [
  { id: "sp_1", name: "Dermatology", active: true },
  { id: "sp_2", name: "General Medicine", active: true },
  { id: "sp_3", name: "Pediatrics", active: true },
  { id: "sp_4", name: "Orthopedics", active: true },
  { id: "sp_5", name: "Gynecology", active: true },
  { id: "sp_6", name: "Cardiology", active: false },
];

export const medicineCategories: MasterRow[] = [
  { id: "mc_1", name: "Analgesics", active: true },
  { id: "mc_2", name: "Antibiotics", active: true },
  { id: "mc_3", name: "Antidiabetics", active: true },
  { id: "mc_4", name: "Antihypertensives", active: true },
  { id: "mc_5", name: "Antihistamines", active: true },
  { id: "mc_6", name: "Dermatology", active: true },
];

export const labTests: MasterRow[] = [
  { id: "lt_1", name: "Complete Blood Count (CBC)", meta: "₹350", active: true },
  { id: "lt_2", name: "HbA1c", meta: "₹500", active: true },
  { id: "lt_3", name: "Thyroid Profile (T3 T4 TSH)", meta: "₹650", active: true },
  { id: "lt_4", name: "Lipid Profile", meta: "₹450", active: true },
  { id: "lt_5", name: "Liver Function Test", meta: "₹600", active: true },
];

export const investigations: MasterRow[] = [
  { id: "iv_1", name: "X-Ray", active: true },
  { id: "iv_2", name: "Ultrasound (USG)", active: true },
  { id: "iv_3", name: "ECG", active: true },
  { id: "iv_4", name: "2D Echo", active: true },
];

export const suppliers: MasterRow[] = [
  { id: "su_1", name: "MediSupply Distributors", meta: "GST 29AAB…", active: true },
  { id: "su_2", name: "HealthFirst Pharma", meta: "GST 29XYZ…", active: true },
  { id: "su_3", name: "CarePlus Wholesale", meta: "GST 29LMN…", active: true },
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
export const holidays: HolidayRow[] = [
  { id: "h_1", name: "Independence Day", date: daysFromNow(13), branch: "All branches" },
  { id: "h_2", name: "Ganesh Chaturthi", date: daysFromNow(25), branch: "All branches" },
  { id: "h_3", name: "Local maintenance", date: daysFromNow(9), branch: "Clinicore HSR Layout" },
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

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

let auditSeq = 100;

/**
 * Append a real audit entry. Every mutating server action calls this so the
 * Audit Log reflects actual activity, not just seed rows.
 */
export function logAudit(entry: {
  actor: string;
  role: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "EXPORT" | "PRINT" | "SIGN";
  entity: string;
  summary: string;
}): void {
  auditLog.unshift({
    id: `au_${auditSeq++}`,
    ...entry,
    at: new Date().toISOString(),
  });
}

export const auditLog: AuditRow[] = [
  { id: "au_1", actor: "Sana Kapoor", role: "RECEPTIONIST", action: "CREATE", entity: "Payment", summary: "Collected ₹900 for INV-2026-000232", at: hoursAgo(1) },
  { id: "au_2", actor: "Dr. Vikram Rao", role: "DOCTOR", action: "CREATE", entity: "Prescription", summary: "Prescription for Kabir Singh", at: hoursAgo(2) },
  { id: "au_3", actor: "Neha Sharma", role: "ADMIN", action: "UPDATE", entity: "Medicine", summary: "Updated reorder level for Adapalene Gel", at: hoursAgo(4) },
  { id: "au_4", actor: "Sana Kapoor", role: "RECEPTIONIST", action: "STATUS_CHANGE", entity: "Appointment", summary: "Checked in Ananya Reddy", at: hoursAgo(5) },
  { id: "au_5", actor: "System", role: "ADMIN", action: "EXPORT", entity: "Report", summary: "Exported monthly revenue report (PDF)", at: hoursAgo(20) },
  { id: "au_6", actor: "Neha Sharma", role: "ADMIN", action: "CREATE", entity: "Branch", summary: "Added Clinicore HSR Layout", at: hoursAgo(48) },
];

// ---------------------------------------------------------------------------
// Report summaries
// ---------------------------------------------------------------------------
export const branchRevenue = branches.map((b, i) => ({
  label: b.name,
  value: [286500, 142300, 57700][i] ?? 40000,
}));

export const doctorRevenue = doctors.map((d, i) => ({
  label: d.fullName,
  value: [128400, 96200, 74500, 112300, 68900][i] ?? 40000,
}));

export const medicineConsumption = medicines.slice(0, 6).map((m, i) => ({
  label: m.name,
  value: [320, 210, 180, 140, 95, 60][i] ?? 50,
}));

export const paymentModeSplit = [
  { label: "Cash", value: 42 },
  { label: "UPI", value: 78 },
  { label: "Card", value: 25 },
  { label: "Net Banking", value: 12 },
  { label: "Insurance", value: 8 },
];

// ---------------------------------------------------------------------------
// Consent forms (e-signature)
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
    id: "cf_1",
    patientId: "pat_arjun",
    patientName: "Arjun Sharma",
    doctorId: "doc_mehta",
    doctorName: "Dr. Ananya Mehta",
    title: "Consent for Dermatological Procedure",
    body: "I consent to undergo the dermatological treatment as advised by my treating doctor. The procedure, its benefits, risks and alternatives have been explained to me. I understand results may vary and no guarantee has been provided.",
    details: "Procedure: chemical peel (glycolic 35%). No known bleeding disorders. Allergy: penicillin (noted).",
    status: "PENDING",
    createdBy: "Sana Kapoor",
  },
  {
    id: "cf_2",
    patientId: "pat_arjun",
    patientName: "Arjun Sharma",
    title: "Data Privacy & Medical Records Consent",
    body: "I authorise the clinic to store and process my medical records for the purpose of my treatment and to share them with treating clinicians. I understand my data is handled per applicable privacy regulations.",
    status: "SIGNED",
    signedAt: daysFromNow(-12),
  },
  {
    id: "cf_3",
    patientId: "pat_kabir",
    patientName: "Kabir Singh",
    title: "Consent for Blood Investigation",
    body: "I consent to the collection of blood samples for the investigations advised by my physician.",
    status: "SIGNED",
    signedAt: daysFromNow(-1),
  },
  {
    id: "cf_4",
    patientId: "pat_rohan",
    patientName: "Rohan Gupta",
    title: "Consent for Physiotherapy Plan",
    body: "I consent to the physiotherapy treatment plan and understand the schedule and expected outcomes discussed with me.",
    status: "PENDING",
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
  { id: "ins_1", provider: "Star Health", planName: "Family Health Optima", tpa: "Star Health TPA", active: true },
  { id: "ins_2", provider: "HDFC Ergo", planName: "Optima Restore", tpa: "Medi Assist", active: true },
  { id: "ins_3", provider: "ICICI Lombard", planName: "Complete Health", tpa: "Health India TPA", active: true },
  { id: "ins_4", provider: "Niva Bupa", planName: "ReAssure 2.0", tpa: "In-house", active: true },
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
  { id: "pi_1", patientId: "pat_kabir", patientName: "Kabir Singh", provider: "Star Health", policyNumber: "SH-4421-99823", validTo: daysFromNow(210), coverage: 500000 },
  { id: "pi_2", patientId: "pat_rohan", patientName: "Rohan Gupta", provider: "HDFC Ergo", policyNumber: "HE-1180-44521", validTo: daysFromNow(140), coverage: 300000 },
  { id: "pi_3", patientId: "pat_arjun", patientName: "Arjun Sharma", provider: "ICICI Lombard", policyNumber: "IL-7712-00934", validTo: daysFromNow(320), coverage: 1000000 },
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
  { id: "lv_1", doctorName: "Dr. Ananya Mehta", from: daysFromNow(6), to: daysFromNow(8), reason: "Conference — IADVL", status: "APPROVED" },
  { id: "lv_2", doctorName: "Dr. Vikram Rao", from: daysFromNow(14), to: daysFromNow(14), reason: "Personal", status: "PENDING" },
  { id: "lv_3", doctorName: "Dr. Imran Khan", from: daysFromNow(-3), to: daysFromNow(-2), reason: "Sick leave", status: "APPROVED" },
];

/** Weekly roster: for each weekday, the working window for the demo doctor. */
export const weeklyRoster = [
  { day: "Monday", hours: "09:00 – 13:00, 16:00 – 19:00", branch: "Clinicore Central" },
  { day: "Tuesday", hours: "09:00 – 13:00", branch: "Clinicore Central" },
  { day: "Wednesday", hours: "16:00 – 20:00", branch: "Clinicore HSR Layout" },
  { day: "Thursday", hours: "09:00 – 13:00, 16:00 – 19:00", branch: "Clinicore Central" },
  { day: "Friday", hours: "10:00 – 14:00", branch: "Clinicore HSR Layout" },
  { day: "Saturday", hours: "09:00 – 13:00", branch: "Clinicore Central" },
  { day: "Sunday", hours: "Off", branch: "—" },
];
