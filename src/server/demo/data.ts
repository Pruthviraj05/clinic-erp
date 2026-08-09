/**
 * Demo dataset + accessors.
 *
 * This is the *current* data source (see `appConfig.dataMode`). It produces
 * objects shaped exactly like the domain view-types so that swapping to the
 * MongoDB repository layer is a drop-in change: same function signatures,
 * same return shapes. Nothing in the UI knows where the data comes from.
 *
 * This dataset is seeded for Dr. Abhijeet Bhosikar's Rheumatology Clinic
 * (Ravet, Pune) — a single real branch and a single real doctor, with all
 * demo transactional data (patients, appointments, prescriptions, invoices)
 * cleared to a clean slate. Fields not yet supplied by the clinic are marked
 * `// PLACEHOLDER` — fill these in via Settings once confirmed.
 */
import type {
  Appointment,
  Branch,
  Doctor,
  Invoice,
  Medicine,
  NotificationItem,
  ActivityItem,
  Patient,
  Prescription,
  Receptionist,
} from "@/types/domain";
import type { Role } from "@/lib/rbac";
import type { SessionUser } from "@/lib/session";

export const DEMO_ORG_ID = "org_bhosikar_rheumatology";

// ---------------------------------------------------------------------------
// Date helpers (relative to now, so sample records always look current)
// ---------------------------------------------------------------------------
function atToday(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
function daysFromNow(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
function yearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Branches — single real clinic
// ---------------------------------------------------------------------------
export const branches: Branch[] = [
  {
    id: "br_ravet",
    code: "RVT",
    name: "Dr. Bhosikar's Rheumatology Clinic",
    city: "Ravet, Pune",
    phone: null, // PLACEHOLDER — add clinic contact number
    email: null, // PLACEHOLDER — add clinic email
    gstNumber: null, // PLACEHOLDER — add GSTIN if registered
    isActive: true,
  },
];

// ---------------------------------------------------------------------------
// Doctors — single real doctor
// ---------------------------------------------------------------------------
export const doctors: Doctor[] = [
  {
    id: "doc_bhosikar",
    userId: "usr_doc_bhosikar",
    fullName: "Dr. Abhijeet Bhosikar",
    email: "doctor@gmail.com", // PLACEHOLDER — confirm real email
    specialization: "Rheumatology",
    department: "Rheumatology — Joint & Back Pain",
    registrationNo: null, // PLACEHOLDER — add Maharashtra Medical Council registration number
    qualifications: "MBBS, MD (Rheumatology)", // PLACEHOLDER — confirm exact qualifications
    consultationFee: 0, // PLACEHOLDER — set real consultation fee
    branchIds: ["br_ravet"],
    isActive: true,
  },
];

// ---------------------------------------------------------------------------
// Receptionists — none seeded; admin adds real staff via the UI
// ---------------------------------------------------------------------------
export const receptionists: Receptionist[] = [];

// ---------------------------------------------------------------------------
// Patients — 3 sample patients with a plausible rheumatology history, for
// walkthroughs/training/help. Clearly fake, distinct from real registrations
// (which admins/reception create via the UI). Plus one demo-login patient
// the hidden PATIENT dev-fallback resolves against. None of this exists in
// MongoDB — mirrored there by scripts/seed-mongodb.mjs, kept in sync.
// ---------------------------------------------------------------------------
export const patients: Patient[] = [
  {
    id: "pat_demo",
    mrn: "DEMO-000001",
    firstName: "Demo",
    lastName: "Patient",
    fullName: "Demo Patient",
    gender: "UNDISCLOSED",
    dateOfBirth: null,
    bloodGroup: "UNKNOWN",
    phone: "+91 00000 00000",
    email: "patient@example.com",
    city: null,
    allergies: null,
    chronicDiseases: null,
    createdAt: new Date().toISOString(),
    lastVisitAt: null,
    isActive: true,
  },
  {
    id: "pat_seed_1",
    mrn: "MRN-100234",
    firstName: "Sunita",
    lastName: "Deshmukh",
    fullName: "Sunita Deshmukh",
    gender: "FEMALE",
    dateOfBirth: yearsAgo(52),
    bloodGroup: "B+",
    phone: "+91 98230 11223",
    email: "sunita.deshmukh@example.com",
    city: "Pune",
    allergies: "None known",
    chronicDiseases: "Rheumatoid arthritis (diagnosed 2021)",
    createdAt: daysFromNow(-240),
    lastVisitAt: daysFromNow(-30),
    isActive: true,
  },
  {
    id: "pat_seed_2",
    mrn: "MRN-100235",
    firstName: "Ramesh",
    lastName: "Kulkarni",
    fullName: "Ramesh Kulkarni",
    gender: "MALE",
    dateOfBirth: yearsAgo(45),
    bloodGroup: "O+",
    phone: "+91 98220 44556",
    email: "ramesh.kulkarni@example.com",
    city: "Pune",
    allergies: "None known",
    chronicDiseases: "Recurrent gout",
    createdAt: daysFromNow(-95),
    lastVisitAt: daysFromNow(-10),
    isActive: true,
  },
  {
    id: "pat_seed_3",
    mrn: "MRN-100236",
    firstName: "Anjali",
    lastName: "Joshi",
    fullName: "Anjali Joshi",
    gender: "FEMALE",
    dateOfBirth: yearsAgo(38),
    bloodGroup: "A+",
    phone: "+91 98901 77889",
    email: "anjali.joshi@example.com",
    city: "Pimpri-Chinchwad",
    allergies: "Sulfa drugs",
    chronicDiseases: null,
    createdAt: daysFromNow(-45),
    lastVisitAt: daysFromNow(-45),
    isActive: true,
  },
];

// ---------------------------------------------------------------------------
// Appointments — history for the 3 sample patients, plus two on today's list
// so the dashboard/queue widgets have something to show.
// ---------------------------------------------------------------------------
const CLINIC_NAME = "Dr. Bhosikar's Rheumatology Clinic";
const DOCTOR_NAME = "Dr. Abhijeet Bhosikar";

export const appointments: Appointment[] = [
  {
    id: "apt_seed_1",
    branchId: "br_ravet",
    branchName: CLINIC_NAME,
    patientId: "pat_seed_1",
    patientName: "Sunita Deshmukh",
    patientMrn: "MRN-100234",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    type: "FOLLOW_UP",
    status: "COMPLETED",
    scheduledStart: daysFromNow(-30, 11, 0),
    scheduledEnd: daysFromNow(-30, 11, 20),
    tokenNumber: 4,
    reason: "RA follow-up — joint pain review",
    paymentStatus: "PAID",
  },
  {
    id: "apt_seed_2",
    branchId: "br_ravet",
    branchName: CLINIC_NAME,
    patientId: "pat_seed_1",
    patientName: "Sunita Deshmukh",
    patientMrn: "MRN-100234",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    type: "FOLLOW_UP",
    status: "CONFIRMED",
    scheduledStart: atToday(11, 0),
    scheduledEnd: atToday(11, 20),
    tokenNumber: 1,
    reason: "RA follow-up — methotrexate response check",
    paymentStatus: "UNPAID",
  },
  {
    id: "apt_seed_3",
    branchId: "br_ravet",
    branchName: CLINIC_NAME,
    patientId: "pat_seed_2",
    patientName: "Ramesh Kulkarni",
    patientMrn: "MRN-100235",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    type: "WALK_IN",
    status: "COMPLETED",
    scheduledStart: daysFromNow(-10, 16, 30),
    scheduledEnd: daysFromNow(-10, 16, 50),
    tokenNumber: 7,
    reason: "Acute gout attack — right great toe",
    paymentStatus: "PAID",
  },
  {
    id: "apt_seed_4",
    branchId: "br_ravet",
    branchName: CLINIC_NAME,
    patientId: "pat_seed_3",
    patientName: "Anjali Joshi",
    patientMrn: "MRN-100236",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    type: "SCHEDULED",
    status: "COMPLETED",
    scheduledStart: daysFromNow(-45, 10, 0),
    scheduledEnd: daysFromNow(-45, 10, 20),
    tokenNumber: 2,
    reason: "Chronic low back pain — initial consult",
    paymentStatus: "PAID",
  },
  {
    id: "apt_seed_5",
    branchId: "br_ravet",
    branchName: CLINIC_NAME,
    patientId: "pat_seed_3",
    patientName: "Anjali Joshi",
    patientMrn: "MRN-100236",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    type: "SCHEDULED",
    status: "SCHEDULED",
    scheduledStart: atToday(15, 30),
    scheduledEnd: atToday(15, 50),
    tokenNumber: 2,
    reason: "Low back pain — review after exercise plan",
    paymentStatus: "UNPAID",
  },
];

// ---------------------------------------------------------------------------
// Prescriptions — one per sample patient, from their completed visit
// ---------------------------------------------------------------------------
export const prescriptions: Prescription[] = [
  {
    id: "rx_seed_1",
    patientId: "pat_seed_1",
    patientName: "Sunita Deshmukh",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    branchId: "br_ravet",
    diagnoses: ["Rheumatoid arthritis (M06.9)"],
    symptoms: "Bilateral hand and wrist joint pain and morning stiffness lasting over an hour.",
    medicines: [
      { name: "Methotrexate 7.5mg", dosage: "1 tablet", frequency: "Weekly", timing: "After food", durationDays: 28, instructions: "Once weekly only — same day each week; take with Folic acid" },
      { name: "Folic Acid 5mg", dosage: "1 tablet", frequency: "Weekly", timing: null, durationDays: 28, instructions: "Take on a different day than Methotrexate" },
      { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 7, instructions: "Short course for flare pain" },
    ],
    investigations: ["CBC", "Liver Function Test", "ESR", "CRP"],
    advice: "Joint protection techniques; gentle range-of-motion exercises; avoid high-impact activity during flare.",
    followUpDate: daysFromNow(2),
    createdAt: daysFromNow(-30, 11, 20),
    vitals: { heightCm: 158, weightKg: 64, bp: "128/82", pulse: 78, tempC: 36.8, spo2: 98 },
  },
  {
    id: "rx_seed_2",
    patientId: "pat_seed_2",
    patientName: "Ramesh Kulkarni",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    branchId: "br_ravet",
    diagnoses: ["Gout, unspecified (M10.9)"],
    symptoms: "Sudden onset severe pain, redness and swelling of the right great toe overnight.",
    medicines: [
      { name: "Colchicine 0.5mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 3, instructions: "Reduce dose if GI upset" },
      { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 5, instructions: null },
    ],
    investigations: ["Serum uric acid", "Renal function test"],
    advice: "Avoid alcohol, red meat, organ meats and sugary drinks during the attack; increase water intake; rest and elevate the affected joint.",
    followUpDate: daysFromNow(4),
    createdAt: daysFromNow(-10, 16, 50),
    vitals: { heightCm: 172, weightKg: 81, bp: "134/86", pulse: 82, tempC: 37.1, spo2: 98 },
  },
  {
    id: "rx_seed_3",
    patientId: "pat_seed_3",
    patientName: "Anjali Joshi",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    branchId: "br_ravet",
    diagnoses: ["Low back pain (M54.5)"],
    symptoms: "Dull aching low back pain for 3 weeks, worse on prolonged sitting, no radiation to legs.",
    medicines: [
      { name: "Aceclofenac 100mg + Paracetamol 325mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 7, instructions: null },
      { name: "Thiocolchicoside 4mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 5, instructions: "Muscle relaxant" },
    ],
    investigations: ["X-ray LS spine if not improving in 2 weeks"],
    advice: "Avoid heavy lifting and prolonged sitting; hot fomentation twice daily; core-strengthening exercises once acute pain settles.",
    followUpDate: atToday(15, 30),
    createdAt: daysFromNow(-45, 10, 20),
    vitals: { heightCm: 162, weightKg: 58, bp: "118/76", pulse: 72, tempC: 36.7, spo2: 99 },
  },
];

// ---------------------------------------------------------------------------
// Invoices — one per sample patient's completed visit
// ---------------------------------------------------------------------------
export const invoices: Invoice[] = [
  {
    id: "inv_seed_1",
    number: "INV-1001",
    branchId: "br_ravet",
    patientId: "pat_seed_1",
    patientName: "Sunita Deshmukh",
    status: "PAID",
    paymentStatus: "PAID",
    items: [{ description: "Consultation — Rheumatology follow-up", quantity: 1, unitPrice: 800, lineTotal: 800 }],
    subtotal: 800,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 800,
    paidAmount: 800,
    balanceAmount: 0,
    createdAt: daysFromNow(-30, 11, 25),
  },
  {
    id: "inv_seed_2",
    number: "INV-1002",
    branchId: "br_ravet",
    patientId: "pat_seed_2",
    patientName: "Ramesh Kulkarni",
    status: "PAID",
    paymentStatus: "PAID",
    items: [{ description: "Consultation — Walk-in (acute gout)", quantity: 1, unitPrice: 800, lineTotal: 800 }],
    subtotal: 800,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 800,
    paidAmount: 800,
    balanceAmount: 0,
    createdAt: daysFromNow(-10, 16, 55),
  },
  {
    id: "inv_seed_3",
    number: "INV-1003",
    branchId: "br_ravet",
    patientId: "pat_seed_3",
    patientName: "Anjali Joshi",
    status: "PARTIALLY_PAID",
    paymentStatus: "PARTIAL",
    items: [{ description: "Consultation — Initial visit", quantity: 1, unitPrice: 800, lineTotal: 800 }],
    subtotal: 800,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 800,
    paidAmount: 400,
    balanceAmount: 400,
    createdAt: daysFromNow(-45, 10, 25),
  },
];

// ---------------------------------------------------------------------------
// Medicines — rheumatology-focused formulary
// ---------------------------------------------------------------------------
export const medicines: Medicine[] = [
  { id: "med_1", name: "Etoricoxib 90mg", genericName: "Etoricoxib", category: "NSAID", brand: null, unit: "Tablet", reorderLevel: 20, stockQty: 0, sellPrice: 12, nearestExpiry: null, isActive: true },
  { id: "med_2", name: "Diclofenac 50mg", genericName: "Diclofenac Sodium", category: "NSAID", brand: null, unit: "Tablet", reorderLevel: 20, stockQty: 0, sellPrice: 4, nearestExpiry: null, isActive: true },
  { id: "med_3", name: "Aceclofenac 100mg + Paracetamol 325mg", genericName: "Aceclofenac + Paracetamol", category: "NSAID", brand: null, unit: "Tablet", reorderLevel: 20, stockQty: 0, sellPrice: 8, nearestExpiry: null, isActive: true },
  { id: "med_4", name: "Methotrexate 7.5mg", genericName: "Methotrexate", category: "DMARD", brand: null, unit: "Tablet", reorderLevel: 10, stockQty: 0, sellPrice: 15, nearestExpiry: null, isActive: true },
  { id: "med_5", name: "Sulfasalazine 500mg", genericName: "Sulfasalazine", category: "DMARD", brand: null, unit: "Tablet", reorderLevel: 10, stockQty: 0, sellPrice: 9, nearestExpiry: null, isActive: true },
  { id: "med_6", name: "Hydroxychloroquine 200mg", genericName: "Hydroxychloroquine Sulfate", category: "DMARD", brand: null, unit: "Tablet", reorderLevel: 10, stockQty: 0, sellPrice: 11, nearestExpiry: null, isActive: true },
  { id: "med_7", name: "Leflunomide 20mg", genericName: "Leflunomide", category: "DMARD", brand: null, unit: "Tablet", reorderLevel: 10, stockQty: 0, sellPrice: 22, nearestExpiry: null, isActive: true },
  { id: "med_8", name: "Prednisolone 5mg", genericName: "Prednisolone", category: "Steroid", brand: null, unit: "Tablet", reorderLevel: 15, stockQty: 0, sellPrice: 3, nearestExpiry: null, isActive: true },
  { id: "med_9", name: "Febuxostat 40mg", genericName: "Febuxostat", category: "Gout Management", brand: null, unit: "Tablet", reorderLevel: 15, stockQty: 0, sellPrice: 14, nearestExpiry: null, isActive: true },
  { id: "med_10", name: "Colchicine 0.5mg", genericName: "Colchicine", category: "Gout Management", brand: null, unit: "Tablet", reorderLevel: 15, stockQty: 0, sellPrice: 6, nearestExpiry: null, isActive: true },
  { id: "med_11", name: "Allopurinol 100mg", genericName: "Allopurinol", category: "Gout Management", brand: null, unit: "Tablet", reorderLevel: 15, stockQty: 0, sellPrice: 5, nearestExpiry: null, isActive: true },
  { id: "med_12", name: "Calcium 500mg + Vitamin D3 250IU", genericName: "Calcium Carbonate + Cholecalciferol", category: "Bone Health", brand: null, unit: "Tablet", reorderLevel: 25, stockQty: 0, sellPrice: 7, nearestExpiry: null, isActive: true },
  { id: "med_13", name: "Vitamin D3 60000IU", genericName: "Cholecalciferol", category: "Bone Health", brand: null, unit: "Sachet", reorderLevel: 20, stockQty: 0, sellPrice: 30, nearestExpiry: null, isActive: true },
  { id: "med_14", name: "Alendronate 70mg", genericName: "Alendronate Sodium", category: "Bone Health", brand: null, unit: "Tablet", reorderLevel: 10, stockQty: 0, sellPrice: 45, nearestExpiry: null, isActive: true },
  { id: "med_15", name: "Thiocolchicoside 4mg", genericName: "Thiocolchicoside", category: "Muscle Relaxant", brand: null, unit: "Tablet", reorderLevel: 20, stockQty: 0, sellPrice: 10, nearestExpiry: null, isActive: true },
  { id: "med_16", name: "Chlorzoxazone 250mg + Paracetamol 500mg", genericName: "Chlorzoxazone + Paracetamol", category: "Muscle Relaxant", brand: null, unit: "Tablet", reorderLevel: 20, stockQty: 0, sellPrice: 6, nearestExpiry: null, isActive: true },
  { id: "med_17", name: "Pantoprazole 40mg", genericName: "Pantoprazole", category: "PPI", brand: null, unit: "Tablet", reorderLevel: 25, stockQty: 0, sellPrice: 5, nearestExpiry: null, isActive: true },
  { id: "med_18", name: "Folic Acid 5mg", genericName: "Folic Acid", category: "Supplement", brand: null, unit: "Tablet", reorderLevel: 20, stockQty: 0, sellPrice: 2, nearestExpiry: null, isActive: true },
  { id: "med_19", name: "Etanercept 25mg Injection", genericName: "Etanercept", category: "Biologic (DMARD)", brand: null, unit: "Injection", reorderLevel: 5, stockQty: 0, sellPrice: 3200, nearestExpiry: null, isActive: true },
  { id: "med_20", name: "Tramadol 37.5mg + Paracetamol 325mg", genericName: "Tramadol + Paracetamol", category: "Analgesic", brand: null, unit: "Tablet", reorderLevel: 20, stockQty: 0, sellPrice: 9, nearestExpiry: null, isActive: true },
];

// ---------------------------------------------------------------------------
// Notifications / activities — clean slate; populated by real usage
// ---------------------------------------------------------------------------
export const notifications: NotificationItem[] = [];
export const activities: ActivityItem[] = [];

// ---------------------------------------------------------------------------
// Session users per role (demo login — hidden dev fallback only)
// ---------------------------------------------------------------------------
const DEMO_USERS: Record<Role, SessionUser> = {
  ADMIN: {
    id: "usr_admin",
    fullName: "Admin",
    email: "admin@gmail.com",
    role: "ADMIN",
    organizationId: DEMO_ORG_ID,
    branchIds: branches.map((b) => b.id),
  },
  DOCTOR: {
    id: "usr_doc_bhosikar",
    fullName: "Dr. Abhijeet Bhosikar",
    email: "doctor@gmail.com",
    role: "DOCTOR",
    organizationId: DEMO_ORG_ID,
    branchId: "br_ravet",
    branchIds: ["br_ravet"],
    linkId: "doc_bhosikar",
  },
  RECEPTIONIST: {
    id: "usr_rec_demo",
    fullName: "Reception (demo)",
    email: "reception@gmail.com",
    role: "RECEPTIONIST",
    organizationId: DEMO_ORG_ID,
    branchId: "br_ravet",
    branchIds: ["br_ravet"],
  },
  PATIENT: {
    id: "usr_pat_demo",
    fullName: "Patient (demo)",
    email: "patient@example.com",
    role: "PATIENT",
    organizationId: DEMO_ORG_ID,
    branchIds: [],
    linkId: "pat_demo",
  },
};

export function getDemoUserByRole(role: Role): SessionUser | null {
  return DEMO_USERS[role] ?? null;
}
