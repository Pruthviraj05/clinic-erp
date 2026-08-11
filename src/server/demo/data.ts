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
export function daysFromNow(days: number, hour = 10, minute = 0): string {
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
// Receptionists — sample front-desk staff so the reception screens demo with
// a real-looking user. Admin replaces/adds actual staff via the UI.
// ---------------------------------------------------------------------------
export const receptionists: Receptionist[] = [
  {
    id: "rec_seed_1",
    userId: "usr_rec_seed_1",
    fullName: "Priya Kale",
    email: "priya.kale@gmail.com",
    branchId: "br_ravet",
    employeeCode: "EMP-001",
    isActive: true,
  },
  {
    id: "rec_seed_2",
    userId: "usr_rec_seed_2",
    fullName: "Sneha Patil",
    email: "sneha.patil@gmail.com",
    branchId: "br_ravet",
    employeeCode: "EMP-002",
    isActive: true,
  },
];

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
  {
    id: "rx_seed_4",
    patientId: "pat_seed_1",
    patientName: "Sunita Deshmukh",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    branchId: "br_ravet",
    diagnoses: ["Rheumatoid arthritis (M06.9)"],
    symptoms: "First visit — 4 months of symmetric small-joint pain and swelling, positive RA factor.",
    medicines: [
      { name: "Prednisolone 5mg", dosage: "2 tablets", frequency: "1-0-1", timing: "After food", durationDays: 10, instructions: "Bridging dose while DMARD takes effect — taper as advised" },
      { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 10, instructions: null },
    ],
    investigations: ["RA Factor", "Anti-CCP Antibody", "ESR", "CRP", "CBC", "Liver Function Test"],
    advice: "Starting DMARD therapy next visit once baseline bloods are back; joint protection advice given.",
    followUpDate: daysFromNow(-16),
    createdAt: daysFromNow(-60, 10, 0),
    vitals: { heightCm: 158, weightKg: 65, bp: "126/80", pulse: 80, tempC: 36.9, spo2: 98 },
  },
  {
    id: "rx_seed_5",
    patientId: "pat_seed_2",
    patientName: "Ramesh Kulkarni",
    doctorId: "doc_bhosikar",
    doctorName: DOCTOR_NAME,
    branchId: "br_ravet",
    diagnoses: ["Gout, unspecified (M10.9)"],
    symptoms: "Second gout flare this year, same right great toe, milder than previous episode.",
    medicines: [
      { name: "Colchicine 0.5mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 3, instructions: null },
      { name: "Febuxostat 40mg", dosage: "1 tablet", frequency: "0-0-1", timing: "After food", durationDays: 30, instructions: "Start once the acute attack has settled, not during" },
    ],
    investigations: ["Serum uric acid"],
    advice: "Discussed starting regular urate-lowering therapy given recurrent attacks; dietary counselling repeated.",
    followUpDate: daysFromNow(-80),
    createdAt: daysFromNow(-90, 9, 15),
    vitals: { heightCm: 172, weightKg: 82, bp: "130/84", pulse: 76, tempC: 36.8, spo2: 98 },
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
// Opening stock is sample data: roughly 3–8× reorder level, with two items
// deliberately at/below reorder level (med_15, med_19) so the low-stock alert
// demos, and one batch (med_10) expiring inside 30 days so the expiry card is
// non-zero. Real counts come from the clinic's first physical stock take.
export const medicines: Medicine[] = [
  { id: "med_1", name: "Etoricoxib 90mg", genericName: "Etoricoxib", category: "NSAID", brand: null, unit: "Tablet", reorderLevel: 20, maxLevel: 100, stockQty: 140, sellPrice: 12, nearestExpiry: daysFromNow(210), isActive: true, mrp: 14, costPrice: 8.5, gstRate: 0.12, hsnCode: "3004", rackLocation: "A-1", schedule: "OTC" },
  { id: "med_2", name: "Diclofenac 50mg", genericName: "Diclofenac Sodium", category: "NSAID", brand: null, unit: "Tablet", reorderLevel: 20, maxLevel: 100, stockQty: 160, sellPrice: 4, nearestExpiry: daysFromNow(300), isActive: true, mrp: 4.8, costPrice: 2.8, gstRate: 0.12, hsnCode: "3004", rackLocation: "A-1", schedule: "OTC" },
  { id: "med_3", name: "Aceclofenac 100mg + Paracetamol 325mg", genericName: "Aceclofenac + Paracetamol", category: "NSAID", brand: null, unit: "Tablet", reorderLevel: 20, maxLevel: 100, stockQty: 120, sellPrice: 8, nearestExpiry: daysFromNow(240), isActive: true, mrp: 9.5, costPrice: 5.6, gstRate: 0.12, hsnCode: "3004", rackLocation: "A-2", schedule: "OTC" },
  { id: "med_4", name: "Methotrexate 7.5mg", genericName: "Methotrexate", category: "DMARD", brand: null, unit: "Tablet", reorderLevel: 10, maxLevel: 50, stockQty: 60, sellPrice: 15, nearestExpiry: daysFromNow(180), isActive: true, mrp: 18, costPrice: 10.5, gstRate: 0.12, hsnCode: "3004", rackLocation: "B-1", schedule: "H" },
  { id: "med_5", name: "Sulfasalazine 500mg", genericName: "Sulfasalazine", category: "DMARD", brand: null, unit: "Tablet", reorderLevel: 10, maxLevel: 50, stockQty: 55, sellPrice: 9, nearestExpiry: null, isActive: true, mrp: 10.5, costPrice: 6.3, gstRate: 0.12, hsnCode: "3004", rackLocation: "B-1", schedule: "H" },
  { id: "med_6", name: "Hydroxychloroquine 200mg", genericName: "Hydroxychloroquine Sulfate", category: "DMARD", brand: null, unit: "Tablet", reorderLevel: 10, maxLevel: 50, stockQty: 48, sellPrice: 11, nearestExpiry: daysFromNow(330), isActive: true, mrp: 13, costPrice: 7.7, gstRate: 0.12, hsnCode: "3004", rackLocation: "B-2", schedule: "H" },
  { id: "med_7", name: "Leflunomide 20mg", genericName: "Leflunomide", category: "DMARD", brand: null, unit: "Tablet", reorderLevel: 10, maxLevel: 50, stockQty: 40, sellPrice: 22, nearestExpiry: daysFromNow(270), isActive: true, mrp: 26, costPrice: 15.4, gstRate: 0.12, hsnCode: "3004", rackLocation: "B-2", schedule: "H" },
  { id: "med_8", name: "Prednisolone 5mg", genericName: "Prednisolone", category: "Steroid", brand: null, unit: "Tablet", reorderLevel: 15, maxLevel: 75, stockQty: 90, sellPrice: 3, nearestExpiry: daysFromNow(150), isActive: true, mrp: 3.6, costPrice: 2.1, gstRate: 0.12, hsnCode: "3004", rackLocation: "B-3", schedule: "H" },
  { id: "med_9", name: "Febuxostat 40mg", genericName: "Febuxostat", category: "Gout Management", brand: null, unit: "Tablet", reorderLevel: 15, maxLevel: 75, stockQty: 100, sellPrice: 14, nearestExpiry: daysFromNow(360), isActive: true, mrp: 16.5, costPrice: 9.8, gstRate: 0.12, hsnCode: "3004", rackLocation: "C-1", schedule: "H" },
  { id: "med_10", name: "Colchicine 0.5mg", genericName: "Colchicine", category: "Gout Management", brand: null, unit: "Tablet", reorderLevel: 15, maxLevel: 75, stockQty: 75, sellPrice: 6, nearestExpiry: daysFromNow(21), isActive: true, mrp: 7.2, costPrice: 4.2, gstRate: 0.12, hsnCode: "3004", rackLocation: "C-1", schedule: "H" },
  { id: "med_11", name: "Allopurinol 100mg", genericName: "Allopurinol", category: "Gout Management", brand: null, unit: "Tablet", reorderLevel: 15, maxLevel: 75, stockQty: 80, sellPrice: 5, nearestExpiry: daysFromNow(420), isActive: true, mrp: 6, costPrice: 3.5, gstRate: 0.12, hsnCode: "3004", rackLocation: "C-2", schedule: "H" },
  { id: "med_12", name: "Calcium 500mg + Vitamin D3 250IU", genericName: "Calcium Carbonate + Cholecalciferol", category: "Bone Health", brand: null, unit: "Tablet", reorderLevel: 25, maxLevel: 125, stockQty: 180, sellPrice: 7, nearestExpiry: daysFromNow(300), isActive: true, mrp: 8.4, costPrice: 4.9, gstRate: 0.05, hsnCode: "3004", rackLocation: "D-1", schedule: "OTC" },
  { id: "med_13", name: "Vitamin D3 60000IU", genericName: "Cholecalciferol", category: "Bone Health", brand: null, unit: "Sachet", reorderLevel: 20, maxLevel: 100, stockQty: 90, sellPrice: 30, nearestExpiry: daysFromNow(240), isActive: true, mrp: 35, costPrice: 21, gstRate: 0.05, hsnCode: "3004", rackLocation: "D-1", schedule: "OTC" },
  { id: "med_14", name: "Alendronate 70mg", genericName: "Alendronate Sodium", category: "Bone Health", brand: null, unit: "Tablet", reorderLevel: 10, maxLevel: 50, stockQty: 45, sellPrice: 45, nearestExpiry: daysFromNow(380), isActive: true, mrp: 54, costPrice: 31.5, gstRate: 0.12, hsnCode: "3004", rackLocation: "D-2", schedule: "H" },
  { id: "med_15", name: "Thiocolchicoside 4mg", genericName: "Thiocolchicoside", category: "Muscle Relaxant", brand: null, unit: "Tablet", reorderLevel: 20, maxLevel: 100, stockQty: 12, sellPrice: 10, nearestExpiry: daysFromNow(190), isActive: true, mrp: 12, costPrice: 7, gstRate: 0.12, hsnCode: "3004", rackLocation: "E-1", schedule: "H" },
  { id: "med_16", name: "Chlorzoxazone 250mg + Paracetamol 500mg", genericName: "Chlorzoxazone + Paracetamol", category: "Muscle Relaxant", brand: null, unit: "Tablet", reorderLevel: 20, maxLevel: 100, stockQty: 130, sellPrice: 6, nearestExpiry: null, isActive: true, mrp: 7.2, costPrice: 4.2, gstRate: 0.12, hsnCode: "3004", rackLocation: "E-1", schedule: "OTC" },
  { id: "med_17", name: "Pantoprazole 40mg", genericName: "Pantoprazole", category: "PPI", brand: null, unit: "Tablet", reorderLevel: 25, maxLevel: 125, stockQty: 200, sellPrice: 5, nearestExpiry: daysFromNow(310), isActive: true, mrp: 6, costPrice: 3.5, gstRate: 0.12, hsnCode: "3004", rackLocation: "E-2", schedule: "OTC" },
  { id: "med_18", name: "Folic Acid 5mg", genericName: "Folic Acid", category: "Supplement", brand: null, unit: "Tablet", reorderLevel: 20, maxLevel: 100, stockQty: 150, sellPrice: 2, nearestExpiry: daysFromNow(350), isActive: true, mrp: 2.4, costPrice: 1.4, gstRate: 0.05, hsnCode: "3004", rackLocation: "D-3", schedule: "OTC" },
  { id: "med_19", name: "Etanercept 25mg Injection", genericName: "Etanercept", category: "Biologic (DMARD)", brand: null, unit: "Injection", reorderLevel: 5, maxLevel: 25, stockQty: 2, sellPrice: 3200, nearestExpiry: daysFromNow(120), isActive: true, mrp: 3600, costPrice: 2800, gstRate: 0.12, hsnCode: "3004", rackLocation: "COLD-1", schedule: "H" },
  { id: "med_20", name: "Tramadol 37.5mg + Paracetamol 325mg", genericName: "Tramadol + Paracetamol", category: "Analgesic", brand: null, unit: "Tablet", reorderLevel: 20, maxLevel: 100, stockQty: 110, sellPrice: 9, nearestExpiry: daysFromNow(220), isActive: true, mrp: 10.8, costPrice: 6.3, gstRate: 0.12, hsnCode: "3004", rackLocation: "C-3", schedule: "H" },
];

// ---------------------------------------------------------------------------
// Notifications / activities — a few sample entries so the bell, the
// notifications page and the "recent activity" widget demo with content.
// `recipientId` targets one user by their session linkId; omit for broadcast.
// ---------------------------------------------------------------------------
export const notifications: NotificationItem[] = [
  {
    id: "ntf_seed_1",
    type: "APPOINTMENT_REMINDER",
    channel: "WHATSAPP",
    title: "Appointment reminder",
    body: "Reminder: your follow-up with Dr. Abhijeet Bhosikar is today at 11:00 AM at Dr. Bhosikar's Rheumatology Clinic, Ravet.",
    status: "SENT",
    createdAt: daysFromNow(-1, 18, 0),
    read: false,
    recipientId: "pat_seed_1",
    actionUrl: "/portal/appointments",
  },
  {
    id: "ntf_seed_2",
    type: "FOLLOWUP_REMINDER",
    channel: "IN_APP",
    title: "Follow-up due",
    body: "Ramesh Kulkarni (MRN-100235) is due for a gout follow-up and uric acid review this week.",
    status: "SENT",
    createdAt: daysFromNow(-2, 9, 30),
    read: true,
    recipientId: "doc_bhosikar",
    actionUrl: "/doctor/patients",
  },
  {
    id: "ntf_seed_3",
    type: "INVENTORY_LOW_STOCK",
    channel: "IN_APP",
    title: "Low stock alert",
    body: "Etanercept 25mg Injection is down to 2 units (reorder level 5). Raise a purchase order with the supplier.",
    status: "SENT",
    createdAt: daysFromNow(-1, 11, 15),
    read: false,
    actionUrl: "/admin/inventory",
  },
];

export const activities: ActivityItem[] = [
  {
    id: "act_seed_1",
    actor: "Priya Kale",
    action: "registered",
    target: "Anjali Joshi",
    at: daysFromNow(-45, 9, 45),
  },
  {
    id: "act_seed_2",
    actor: "Dr. Abhijeet Bhosikar",
    action: "issued a prescription for",
    target: "Ramesh Kulkarni",
    at: daysFromNow(-10, 16, 50),
  },
  {
    id: "act_seed_3",
    actor: "Priya Kale",
    action: "collected payment for",
    target: "Invoice INV-1002",
    at: daysFromNow(-10, 16, 55),
  },
];

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
