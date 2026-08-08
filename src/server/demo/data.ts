/**
 * Demo dataset + accessors.
 *
 * This is the *current* data source (see `appConfig.dataMode`). It produces
 * objects shaped exactly like the domain view-types so that swapping to the
 * Prisma repository layer is a drop-in change: same function signatures, same
 * return shapes. Nothing in the UI knows where the data comes from.
 *
 * Dates are computed relative to "now" so dashboards always show a realistic
 * "today". Data is otherwise deterministic and hand-authored (no randomness).
 */
import type {
  Appointment,
  AppointmentStatus,
  Branch,
  DashboardMetrics,
  Doctor,
  Invoice,
  Medicine,
  NotificationItem,
  ActivityItem,
  Patient,
  Prescription,
  Receptionist,
  TrendPoint,
} from "@/types/domain";
import type { Role } from "@/lib/rbac";
import type { SessionUser } from "@/lib/session";

export const DEMO_ORG_ID = "org_clinicore";

// ---------------------------------------------------------------------------
// Date helpers (relative to now, so "today" is always populated)
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
function addMinutes(iso: string, mins: number): string {
  return new Date(new Date(iso).getTime() + mins * 60_000).toISOString();
}
function yearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------
export const branches: Branch[] = [
  { id: "br_central", code: "CTR", name: "Clinicore Central", city: "Bengaluru", phone: "+91 80 4123 0001", email: "central@clinicore.app", gstNumber: "29ABCDE1234F1Z5", isActive: true },
  { id: "br_north", code: "NTH", name: "Clinicore Northside", city: "Bengaluru", phone: "+91 80 4123 0002", email: "north@clinicore.app", gstNumber: "29ABCDE1234F1Z5", isActive: true },
  { id: "br_hsr", code: "HSR", name: "Clinicore HSR Layout", city: "Bengaluru", phone: "+91 80 4123 0003", email: "hsr@clinicore.app", gstNumber: "29ABCDE1234F1Z5", isActive: true },
];

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------
export const doctors: Doctor[] = [
  { id: "doc_mehta", userId: "usr_doc_mehta", fullName: "Dr. Ananya Mehta", email: "ananya.mehta@clinicore.app", specialization: "Dermatology", department: "Skin & Aesthetics", registrationNo: "KMC-48213", qualifications: "MBBS, MD (Dermatology)", consultationFee: 800, branchIds: ["br_central", "br_hsr"], isActive: true },
  { id: "doc_rao", userId: "usr_doc_rao", fullName: "Dr. Vikram Rao", email: "vikram.rao@clinicore.app", specialization: "General Medicine", department: "General Medicine", registrationNo: "KMC-51902", qualifications: "MBBS, MD (Internal Medicine)", consultationFee: 600, branchIds: ["br_central", "br_north"], isActive: true },
  { id: "doc_iyer", userId: "usr_doc_iyer", fullName: "Dr. Priya Iyer", email: "priya.iyer@clinicore.app", specialization: "Pediatrics", department: "Child Care", registrationNo: "KMC-44120", qualifications: "MBBS, DCH", consultationFee: 700, branchIds: ["br_north"], isActive: true },
  { id: "doc_khan", userId: "usr_doc_khan", fullName: "Dr. Imran Khan", email: "imran.khan@clinicore.app", specialization: "Orthopedics", department: "Bone & Joint", registrationNo: "KMC-39871", qualifications: "MBBS, MS (Ortho)", consultationFee: 900, branchIds: ["br_central", "br_hsr"], isActive: true },
  { id: "doc_nair", userId: "usr_doc_nair", fullName: "Dr. Meera Nair", email: "meera.nair@clinicore.app", specialization: "Gynecology", department: "Women's Health", registrationNo: "KMC-42765", qualifications: "MBBS, DGO", consultationFee: 750, branchIds: ["br_hsr"], isActive: true },
];

// ---------------------------------------------------------------------------
// Receptionists
// ---------------------------------------------------------------------------
export const receptionists: Receptionist[] = [
  { id: "rec_sana", userId: "usr_rec_sana", fullName: "Sana Kapoor", email: "sana.kapoor@clinicore.app", branchId: "br_central", employeeCode: "EMP-1004", isActive: true },
  { id: "rec_rahul", userId: "usr_rec_rahul", fullName: "Rahul Verma", email: "rahul.verma@clinicore.app", branchId: "br_north", employeeCode: "EMP-1009", isActive: true },
];

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------
export const patients: Patient[] = [
  { id: "pat_arjun", mrn: "MRN-100234", firstName: "Arjun", lastName: "Sharma", fullName: "Arjun Sharma", gender: "MALE", dateOfBirth: yearsAgo(34), bloodGroup: "O_POSITIVE", phone: "+91 98450 11223", email: "arjun.sharma@gmail.com", city: "Bengaluru", allergies: "Penicillin", chronicDiseases: null, createdAt: daysFromNow(-220), lastVisitAt: daysFromNow(-12), isActive: true },
  { id: "pat_diya", mrn: "MRN-100235", firstName: "Diya", lastName: "Patel", fullName: "Diya Patel", gender: "FEMALE", dateOfBirth: yearsAgo(28), bloodGroup: "A_POSITIVE", phone: "+91 98450 33445", email: "diya.patel@gmail.com", city: "Bengaluru", allergies: null, chronicDiseases: "Hypothyroidism", createdAt: daysFromNow(-190), lastVisitAt: daysFromNow(-3), isActive: true },
  { id: "pat_kabir", mrn: "MRN-100236", firstName: "Kabir", lastName: "Singh", fullName: "Kabir Singh", gender: "MALE", dateOfBirth: yearsAgo(45), bloodGroup: "B_POSITIVE", phone: "+91 98450 55667", email: "kabir.singh@gmail.com", city: "Bengaluru", allergies: null, chronicDiseases: "Type 2 Diabetes, Hypertension", createdAt: daysFromNow(-410), lastVisitAt: daysFromNow(-1), isActive: true },
  { id: "pat_zara", mrn: "MRN-100237", firstName: "Zara", lastName: "Khan", fullName: "Zara Khan", gender: "FEMALE", dateOfBirth: yearsAgo(6), bloodGroup: "AB_POSITIVE", phone: "+91 98450 77889", email: null, city: "Bengaluru", allergies: "Peanuts", chronicDiseases: null, createdAt: daysFromNow(-95), lastVisitAt: daysFromNow(-30), isActive: true },
  { id: "pat_rohan", mrn: "MRN-100238", firstName: "Rohan", lastName: "Gupta", fullName: "Rohan Gupta", gender: "MALE", dateOfBirth: yearsAgo(52), bloodGroup: "O_NEGATIVE", phone: "+91 98450 99001", email: "rohan.gupta@gmail.com", city: "Bengaluru", allergies: null, chronicDiseases: "Osteoarthritis", createdAt: daysFromNow(-300), lastVisitAt: daysFromNow(-7), isActive: true },
  { id: "pat_ananya", mrn: "MRN-100239", firstName: "Ananya", lastName: "Reddy", fullName: "Ananya Reddy", gender: "FEMALE", dateOfBirth: yearsAgo(31), bloodGroup: "A_NEGATIVE", phone: "+91 98450 22110", email: "ananya.reddy@gmail.com", city: "Bengaluru", allergies: null, chronicDiseases: null, createdAt: daysFromNow(-60), lastVisitAt: daysFromNow(-2), isActive: true },
  { id: "pat_vivaan", mrn: "MRN-100240", firstName: "Vivaan", lastName: "Mehta", fullName: "Vivaan Mehta", gender: "MALE", dateOfBirth: yearsAgo(3), bloodGroup: "B_NEGATIVE", phone: "+91 98450 44332", email: null, city: "Bengaluru", allergies: null, chronicDiseases: null, createdAt: daysFromNow(-40), lastVisitAt: daysFromNow(-5), isActive: true },
  { id: "pat_isha", mrn: "MRN-100241", firstName: "Isha", lastName: "Nair", fullName: "Isha Nair", gender: "FEMALE", dateOfBirth: yearsAgo(39), bloodGroup: "O_POSITIVE", phone: "+91 98450 66554", email: "isha.nair@gmail.com", city: "Bengaluru", allergies: "Sulfa drugs", chronicDiseases: null, createdAt: daysFromNow(-150), lastVisitAt: daysFromNow(-20), isActive: true },
];

/** The patient linked to the patient-portal demo login. */
export const PORTAL_PATIENT_ID = "pat_arjun";

// ---------------------------------------------------------------------------
// Appointments — today's schedule + upcoming
// ---------------------------------------------------------------------------
const patientById = new Map(patients.map((p) => [p.id, p]));
const doctorById = new Map(doctors.map((d) => [d.id, d]));
const branchById = new Map(branches.map((b) => [b.id, b]));

function appt(
  id: string,
  patientId: string,
  doctorId: string,
  branchId: string,
  start: string,
  durationMin: number,
  status: AppointmentStatus,
  type: Appointment["type"],
  token: number | null,
  reason: string,
  paymentStatus: Appointment["paymentStatus"],
): Appointment {
  const patient = patientById.get(patientId)!;
  const doctor = doctorById.get(doctorId)!;
  const branch = branchById.get(branchId)!;
  return {
    id,
    branchId,
    branchName: branch.name,
    patientId,
    patientName: patient.fullName,
    patientMrn: patient.mrn,
    doctorId,
    doctorName: doctor.fullName,
    type,
    status,
    scheduledStart: start,
    scheduledEnd: addMinutes(start, durationMin),
    tokenNumber: token,
    reason,
    paymentStatus,
  };
}

export const appointments: Appointment[] = [
  appt("apt_001", "pat_arjun", "doc_mehta", "br_central", atToday(9, 0), 15, "COMPLETED", "SCHEDULED", 1, "Acne follow-up", "PAID"),
  appt("apt_002", "pat_diya", "doc_rao", "br_central", atToday(9, 30), 15, "COMPLETED", "SCHEDULED", 2, "Thyroid review", "PAID"),
  appt("apt_003", "pat_kabir", "doc_rao", "br_central", atToday(10, 0), 20, "IN_PROGRESS", "FOLLOW_UP", 3, "Diabetes management", "UNPAID"),
  appt("apt_004", "pat_ananya", "doc_mehta", "br_central", atToday(10, 30), 15, "CHECKED_IN", "SCHEDULED", 4, "Skin rash", "PAID"),
  appt("apt_005", "pat_rohan", "doc_khan", "br_central", atToday(11, 0), 20, "CONFIRMED", "SCHEDULED", 5, "Knee pain", "UNPAID"),
  appt("apt_006", "pat_isha", "doc_mehta", "br_central", atToday(11, 30), 15, "SCHEDULED", "SCHEDULED", 6, "Pigmentation consult", "UNPAID"),
  appt("apt_007", "pat_zara", "doc_iyer", "br_north", atToday(12, 0), 15, "SCHEDULED", "SCHEDULED", 1, "Fever & cough", "UNPAID"),
  appt("apt_008", "pat_vivaan", "doc_iyer", "br_north", atToday(12, 30), 15, "NO_SHOW", "SCHEDULED", 2, "Vaccination", "UNPAID"),
  appt("apt_009", "pat_kabir", "doc_khan", "br_central", atToday(15, 0), 20, "SCHEDULED", "SCHEDULED", 7, "Back pain", "UNPAID"),
  appt("apt_010", "pat_diya", "doc_mehta", "br_central", atToday(15, 30), 15, "SCHEDULED", "WALK_IN", 8, "Hair fall", "UNPAID"),
  // Upcoming
  appt("apt_011", "pat_arjun", "doc_mehta", "br_central", daysFromNow(1, 10, 0), 15, "CONFIRMED", "FOLLOW_UP", null, "Acne review", "UNPAID"),
  appt("apt_012", "pat_ananya", "doc_rao", "br_central", daysFromNow(1, 11, 30), 15, "SCHEDULED", "SCHEDULED", null, "General checkup", "UNPAID"),
  appt("apt_013", "pat_rohan", "doc_khan", "br_hsr", daysFromNow(2, 9, 30), 20, "SCHEDULED", "FOLLOW_UP", null, "Physiotherapy plan", "UNPAID"),
  appt("apt_014", "pat_isha", "doc_nair", "br_hsr", daysFromNow(3, 10, 0), 20, "SCHEDULED", "SCHEDULED", null, "Annual gynae checkup", "UNPAID"),
  appt("apt_015", "pat_zara", "doc_iyer", "br_north", daysFromNow(4, 12, 0), 15, "SCHEDULED", "FOLLOW_UP", null, "Post-fever review", "UNPAID"),
];

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------
export const prescriptions: Prescription[] = [
  {
    id: "rx_001",
    patientId: "pat_arjun",
    patientName: "Arjun Sharma",
    doctorId: "doc_mehta",
    doctorName: "Dr. Ananya Mehta",
    branchId: "br_central",
    diagnoses: ["Acne vulgaris (L70.0)"],
    symptoms: "Recurrent facial acne, mild scarring",
    medicines: [
      { name: "Adapalene 0.1% Gel", dosage: "Apply thin layer", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: "Avoid sun exposure" },
      { name: "Doxycycline 100mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After breakfast", durationDays: 14, instructions: "Complete the course" },
    ],
    investigations: [],
    advice: "Use gentle cleanser twice daily. Avoid oil-based cosmetics.",
    followUpDate: daysFromNow(14),
    createdAt: atToday(9, 12),
    vitals: { heightCm: 176, weightKg: 72, bp: "120/80", pulse: 74, tempC: 36.8, spo2: 99 },
  },
  {
    id: "rx_002",
    patientId: "pat_kabir",
    patientName: "Kabir Singh",
    doctorId: "doc_rao",
    doctorName: "Dr. Vikram Rao",
    branchId: "br_central",
    diagnoses: ["Type 2 Diabetes Mellitus (E11.9)", "Essential hypertension (I10)"],
    symptoms: "Elevated fasting glucose, occasional headaches",
    medicines: [
      { name: "Metformin 500mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After meals", durationDays: 30, instructions: null },
      { name: "Telmisartan 40mg", dosage: "1 tablet", frequency: "1-0-0", timing: "Morning", durationDays: 30, instructions: "Monitor BP weekly" },
    ],
    investigations: ["HbA1c", "Fasting blood sugar"],
    advice: "Low-carb diet, 30 min brisk walk daily. Repeat HbA1c in 3 months.",
    followUpDate: daysFromNow(30),
    createdAt: daysFromNow(-1, 10, 20),
    vitals: { heightCm: 170, weightKg: 82, bp: "140/90", pulse: 78, tempC: 36.6, spo2: 97 },
  },
  // Past visits so the doctor consult screen's "Case History" has something to
  // show for today's returning patients (apt_004 / apt_006).
  {
    id: "rx_003",
    patientId: "pat_ananya",
    patientName: "Ananya Reddy",
    doctorId: "doc_mehta",
    doctorName: "Dr. Ananya Mehta",
    branchId: "br_central",
    diagnoses: ["Allergic contact dermatitis (L23.9)"],
    symptoms: "Itchy red rash on both forearms, started after using a new soap",
    medicines: [
      { name: "Hydrocortisone 1% Cream", dosage: "Apply thin layer", frequency: "0-0-1", timing: "At night", durationDays: 14, instructions: "Avoid affected area contact with soap" },
      { name: "Cetirizine 10mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 7, instructions: null },
    ],
    investigations: ["Skin patch test"],
    advice: "Avoid new cosmetics/soaps for 2 weeks. Patch test before reintroducing the suspected allergen.",
    followUpDate: daysFromNow(-15),
    createdAt: daysFromNow(-45, 11, 0),
    vitals: { bp: "118/76", pulse: 72, tempC: 36.7, spo2: 99 },
  },
  {
    id: "rx_004",
    patientId: "pat_isha",
    patientName: "Isha Nair",
    doctorId: "doc_mehta",
    doctorName: "Dr. Ananya Mehta",
    branchId: "br_central",
    diagnoses: ["Melasma (L81.1)"],
    symptoms: "Symmetric brown patches on cheeks, worsening over the last 6 months",
    medicines: [
      { name: "Tranexamic Acid 250mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 30, instructions: null },
      { name: "Sunscreen SPF50 Gel", dosage: "Apply liberally", frequency: "1-1-1", timing: "Every 3 hours outdoors", durationDays: 30, instructions: "Reapply after sweating" },
    ],
    investigations: ["Wood's lamp examination"],
    advice: "Strict sun protection — wide-brim hat outdoors. Avoid direct midday sun exposure.",
    followUpDate: daysFromNow(-30),
    createdAt: daysFromNow(-60, 16, 30),
    vitals: { bp: "112/74", pulse: 68, tempC: 36.6, spo2: 99 },
  },
  // Earlier acne visit for Arjun — shows a multi-visit treatment timeline
  // leading into rx_001. NOTE: Arjun is allergic to Penicillin, so his
  // regimen never uses penicillin/amoxicillin-class antibiotics.
  {
    id: "rx_005",
    patientId: "pat_arjun",
    patientName: "Arjun Sharma",
    doctorId: "doc_mehta",
    doctorName: "Dr. Ananya Mehta",
    branchId: "br_central",
    diagnoses: ["Acne vulgaris (L70.0)"],
    symptoms: "New-onset facial acne over the last 2 months, mostly on cheeks and jawline",
    medicines: [
      { name: "Benzoyl Peroxide 2.5% Wash", dosage: "Cleanse affected area", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: "Introduce gradually to avoid dryness" },
      { name: "Adapalene 0.1% Gel", dosage: "Apply thin layer", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: "Start alternate nights, avoid sun exposure" },
    ],
    investigations: [],
    advice: "Non-comedogenic sunscreen daily. Avoid picking/popping lesions. Reassess in 6 weeks.",
    followUpDate: daysFromNow(-30),
    createdAt: daysFromNow(-75, 10, 0),
    vitals: { heightCm: 176, weightKg: 71, bp: "118/78", pulse: 76, tempC: 36.7, spo2: 99 },
  },
  // Kabir's original diabetes diagnosis visit — shows disease progression
  // (higher HbA1c workup, single agent) into today's two-drug follow-up.
  {
    id: "rx_006",
    patientId: "pat_kabir",
    patientName: "Kabir Singh",
    doctorId: "doc_rao",
    doctorName: "Dr. Vikram Rao",
    branchId: "br_central",
    diagnoses: ["Type 2 Diabetes Mellitus (E11.9)"],
    symptoms: "Increased thirst and fatigue for 3 weeks; family history of diabetes",
    medicines: [
      { name: "Metformin 500mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After breakfast", durationDays: 15, instructions: "Increase to twice daily if tolerated well" },
    ],
    investigations: ["HbA1c", "Fasting blood sugar", "Lipid profile"],
    advice: "Start structured diet plan, avoid refined sugar. Home glucose monitoring twice weekly.",
    followUpDate: daysFromNow(-165),
    createdAt: daysFromNow(-180, 9, 45),
    vitals: { heightCm: 170, weightKg: 86, bp: "148/94", pulse: 82, tempC: 36.8, spo2: 96 },
  },
  // Diya's thyroid diagnosis + a follow-up dose review, matching her
  // chronicDiseases: "Hypothyroidism" and today's "Thyroid review" visit.
  {
    id: "rx_007",
    patientId: "pat_diya",
    patientName: "Diya Patel",
    doctorId: "doc_rao",
    doctorName: "Dr. Vikram Rao",
    branchId: "br_central",
    diagnoses: ["Hypothyroidism (E03.9)"],
    symptoms: "Fatigue, weight gain and cold intolerance over 2-3 months",
    medicines: [
      { name: "Levothyroxine 50mcg", dosage: "1 tablet", frequency: "1-0-0", timing: "Before food", durationDays: 60, instructions: "Take on empty stomach, 30 min before breakfast" },
    ],
    investigations: ["Thyroid Profile (T3 T4 TSH)"],
    advice: "Recheck TSH in 6-8 weeks before adjusting dose. Iodine-rich diet not required.",
    followUpDate: daysFromNow(-45),
    createdAt: daysFromNow(-100, 11, 15),
    vitals: { heightCm: 160, weightKg: 68, bp: "122/80", pulse: 64, tempC: 36.5, spo2: 98 },
  },
  {
    id: "rx_008",
    patientId: "pat_diya",
    patientName: "Diya Patel",
    doctorId: "doc_rao",
    doctorName: "Dr. Vikram Rao",
    branchId: "br_central",
    diagnoses: ["Hypothyroidism (E03.9)"],
    symptoms: "Feeling better, less fatigue; here for routine dose review",
    medicines: [
      { name: "Levothyroxine 75mcg", dosage: "1 tablet", frequency: "1-0-0", timing: "Before food", durationDays: 90, instructions: "Dose increased — take on empty stomach" },
    ],
    investigations: ["Thyroid Profile (T3 T4 TSH)"],
    advice: "TSH trending down well. Continue current dose, recheck in 3 months.",
    followUpDate: daysFromNow(-10),
    createdAt: daysFromNow(-40, 10, 30),
    vitals: { heightCm: 160, weightKg: 66, bp: "118/76", pulse: 70, tempC: 36.6, spo2: 99 },
  },
  // Rohan's orthopedic visit for chronic osteoarthritis (matches his knee
  // pain appointments and chronicDiseases field).
  {
    id: "rx_009",
    patientId: "pat_rohan",
    patientName: "Rohan Gupta",
    doctorId: "doc_khan",
    doctorName: "Dr. Imran Khan",
    branchId: "br_central",
    diagnoses: ["Osteoarthritis of knee (M17.9)"],
    symptoms: "Bilateral knee pain and stiffness, worse in the morning and on stairs",
    medicines: [
      { name: "Aceclofenac 100mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 10, instructions: null },
      { name: "Glucosamine Sulfate 1500mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 60, instructions: "Long-term supplement, effect builds over weeks" },
    ],
    investigations: ["X-Ray"],
    advice: "Weight management, quadriceps strengthening exercises, avoid prolonged squatting/kneeling.",
    followUpDate: daysFromNow(-25),
    createdAt: daysFromNow(-40, 12, 0),
    vitals: { heightCm: 172, weightKg: 88, bp: "130/84", pulse: 78, tempC: 36.7, spo2: 98 },
  },
  // Zara's earlier visit for a similar complaint — pediatric dosing.
  {
    id: "rx_010",
    patientId: "pat_zara",
    patientName: "Zara Khan",
    doctorId: "doc_iyer",
    doctorName: "Dr. Priya Iyer",
    branchId: "br_north",
    diagnoses: ["Acute upper respiratory infection (J06.9)"],
    symptoms: "Runny nose, mild cough and low-grade fever for 2 days",
    medicines: [
      { name: "Paracetamol Syrup 250mg/5ml", dosage: "5 ml", frequency: "SOS", timing: "After food", durationDays: 5, instructions: "Only if fever above 100°F, max 3 doses/day" },
      { name: "Saline Nasal Drops", dosage: "2 drops each nostril", frequency: "1-1-1", timing: null, durationDays: 5, instructions: "Before feeds" },
    ],
    investigations: [],
    advice: "Plenty of fluids, steam inhalation. Return if fever persists beyond 3 days or breathing difficulty.",
    followUpDate: daysFromNow(-45),
    createdAt: daysFromNow(-50, 17, 0),
    vitals: { weightKg: 20, tempC: 37.6, pulse: 98, spo2: 98 },
  },
  // Isha's original melasma diagnosis — a second doc_mehta visit so her
  // one-click case history shows a treatment timeline, not just one entry.
  {
    id: "rx_011",
    patientId: "pat_isha",
    patientName: "Isha Nair",
    doctorId: "doc_mehta",
    doctorName: "Dr. Ananya Mehta",
    branchId: "br_central",
    diagnoses: ["Melasma (L81.1)"],
    symptoms: "First presentation of facial pigmentation, gradually spreading over 6 months",
    medicines: [
      { name: "Sunscreen SPF50 Gel", dosage: "Apply liberally", frequency: "1-1-1", timing: "Every 3 hours outdoors", durationDays: 30, instructions: "Start immediately, before other actives" },
      { name: "Hydroquinone 4% Cream", dosage: "Apply thin layer", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: "Localized to pigmented patches only; avoid sulfa-based products" },
    ],
    investigations: [],
    advice: "Strict photoprotection is the priority — treatment will not work without it. Review in 4 weeks.",
    followUpDate: daysFromNow(-60),
    createdAt: daysFromNow(-90, 15, 0),
    vitals: { bp: "114/72", pulse: 70, tempC: 36.6, spo2: 99 },
  },
  // Diya's earlier hair-fall visit with Dr. Mehta — gives today's walk-in
  // (apt_010) a same-doctor history to repeat from, distinct from her
  // separate thyroid-care history with Dr. Rao (rx_007/rx_008).
  {
    id: "rx_012",
    patientId: "pat_diya",
    patientName: "Diya Patel",
    doctorId: "doc_mehta",
    doctorName: "Dr. Ananya Mehta",
    branchId: "br_central",
    diagnoses: ["Telogen effluvium (L65.0)"],
    symptoms: "Increased hair shedding over the last 3 months, no bald patches",
    medicines: [
      { name: "Biotin 10mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 90, instructions: null },
      { name: "Minoxidil 5% Solution", dosage: "1 ml", frequency: "1-0-1", timing: null, durationDays: 90, instructions: "Apply to scalp, not hair; do not wash off for 4 hours" },
    ],
    investigations: ["Thyroid Profile (T3 T4 TSH)", "Ferritin"],
    advice: "Likely stress/thyroid-related shedding — coordinate with her physician on thyroid control. Recheck in 3 months; shedding typically improves gradually.",
    followUpDate: daysFromNow(-20),
    createdAt: daysFromNow(-90, 14, 0),
    vitals: { bp: "120/78", pulse: 72, tempC: 36.6, spo2: 99 },
  },
];

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export const invoices: Invoice[] = [
  {
    id: "inv_001", number: "INV-2026-000231", branchId: "br_central", patientId: "pat_arjun", patientName: "Arjun Sharma",
    status: "PAID", paymentStatus: "PAID",
    items: [{ description: "Consultation — Dr. Ananya Mehta", quantity: 1, unitPrice: 800, lineTotal: 800 }],
    subtotal: 800, discountAmount: 0, taxAmount: 0, totalAmount: 800, paidAmount: 800, balanceAmount: 0, createdAt: atToday(9, 15),
  },
  {
    id: "inv_002", number: "INV-2026-000232", branchId: "br_central", patientId: "pat_diya", patientName: "Diya Patel",
    status: "PAID", paymentStatus: "PAID",
    items: [{ description: "Consultation — Dr. Vikram Rao", quantity: 1, unitPrice: 600, lineTotal: 600 }, { description: "TSH Blood Test", quantity: 1, unitPrice: 350, lineTotal: 350 }],
    subtotal: 950, discountAmount: 50, taxAmount: 0, totalAmount: 900, paidAmount: 900, balanceAmount: 0, createdAt: atToday(9, 45),
  },
  {
    id: "inv_003", number: "INV-2026-000233", branchId: "br_central", patientId: "pat_kabir", patientName: "Kabir Singh",
    status: "PARTIALLY_PAID", paymentStatus: "PARTIAL",
    items: [{ description: "Consultation — Dr. Vikram Rao", quantity: 1, unitPrice: 600, lineTotal: 600 }, { description: "HbA1c Test", quantity: 1, unitPrice: 500, lineTotal: 500 }],
    subtotal: 1100, discountAmount: 0, taxAmount: 0, totalAmount: 1100, paidAmount: 600, balanceAmount: 500, createdAt: atToday(10, 20),
  },
];

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export const medicines: Medicine[] = [
  { id: "med_001", name: "Paracetamol 500mg", genericName: "Acetaminophen", category: "Analgesics", brand: "Dolo", unit: "tablet", reorderLevel: 100, stockQty: 640, sellPrice: 2, nearestExpiry: daysFromNow(300), isActive: true },
  { id: "med_002", name: "Amoxicillin 500mg", genericName: "Amoxicillin", category: "Antibiotics", brand: "Mox", unit: "capsule", reorderLevel: 80, stockQty: 45, sellPrice: 6, nearestExpiry: daysFromNow(120), isActive: true },
  { id: "med_003", name: "Metformin 500mg", genericName: "Metformin", category: "Antidiabetics", brand: "Glycomet", unit: "tablet", reorderLevel: 120, stockQty: 90, sellPrice: 3, nearestExpiry: daysFromNow(220), isActive: true },
  { id: "med_004", name: "Adapalene 0.1% Gel", genericName: "Adapalene", category: "Dermatology", brand: "Adaferin", unit: "tube", reorderLevel: 20, stockQty: 12, sellPrice: 240, nearestExpiry: daysFromNow(45), isActive: true },
  { id: "med_005", name: "Telmisartan 40mg", genericName: "Telmisartan", category: "Antihypertensives", brand: "Telma", unit: "tablet", reorderLevel: 100, stockQty: 310, sellPrice: 5, nearestExpiry: daysFromNow(400), isActive: true },
  { id: "med_006", name: "Cetirizine 10mg", genericName: "Cetirizine", category: "Antihistamines", brand: "Cetzine", unit: "tablet", reorderLevel: 60, stockQty: 28, sellPrice: 2, nearestExpiry: daysFromNow(30), isActive: true },
];

// ---------------------------------------------------------------------------
// Notifications & activity
// ---------------------------------------------------------------------------
export const notifications: NotificationItem[] = [
  { id: "ntf_1", type: "APPOINTMENT_REMINDER", channel: "WHATSAPP", title: "Appointment reminder sent", body: "Reminder sent to Arjun Sharma for 10:00 AM.", status: "SENT", createdAt: atToday(8, 30), read: false },
  { id: "ntf_2", type: "INVENTORY_LOW_STOCK", channel: "IN_APP", title: "Low stock alert", body: "Adapalene 0.1% Gel is below reorder level (12/20).", status: "SENT", createdAt: atToday(8, 5), read: false },
  { id: "ntf_3", type: "PAYMENT_CONFIRMATION", channel: "EMAIL", title: "Payment received", body: "₹900 received from Diya Patel (INV-2026-000232).", status: "SENT", createdAt: atToday(9, 46), read: true },
  { id: "ntf_4", type: "INVENTORY_EXPIRY", channel: "IN_APP", title: "Expiry warning", body: "Cetirizine 10mg batch expires in 30 days.", status: "SENT", createdAt: atToday(7, 50), read: true },
];

export const activities: ActivityItem[] = [
  { id: "act_1", actor: "Sana Kapoor", action: "checked in", target: "Ananya Reddy", at: atToday(10, 25) },
  { id: "act_2", actor: "Dr. Vikram Rao", action: "created prescription for", target: "Kabir Singh", at: atToday(10, 20) },
  { id: "act_3", actor: "Sana Kapoor", action: "collected ₹900 from", target: "Diya Patel", at: atToday(9, 46) },
  { id: "act_4", actor: "Dr. Ananya Mehta", action: "completed consultation with", target: "Arjun Sharma", at: atToday(9, 12) },
  { id: "act_5", actor: "System", action: "sent WhatsApp reminder to", target: "5 patients", at: atToday(8, 30) },
];

// ---------------------------------------------------------------------------
// Session users per role (demo login)
// ---------------------------------------------------------------------------
const DEMO_USERS: Record<Role, SessionUser> = {
  ADMIN: {
    id: "usr_admin",
    fullName: "Neha Sharma",
    email: "admin@clinicore.app",
    role: "ADMIN",
    organizationId: DEMO_ORG_ID,
    branchIds: branches.map((b) => b.id),
  },
  DOCTOR: {
    id: "usr_doc_mehta",
    fullName: "Dr. Ananya Mehta",
    email: "ananya.mehta@clinicore.app",
    role: "DOCTOR",
    organizationId: DEMO_ORG_ID,
    branchId: "br_central",
    branchIds: ["br_central", "br_hsr"],
  },
  RECEPTIONIST: {
    id: "usr_rec_sana",
    fullName: "Sana Kapoor",
    email: "sana.kapoor@clinicore.app",
    role: "RECEPTIONIST",
    organizationId: DEMO_ORG_ID,
    branchId: "br_central",
    branchIds: ["br_central"],
  },
  PATIENT: {
    id: "usr_pat_arjun",
    fullName: "Arjun Sharma",
    email: "arjun.sharma@gmail.com",
    role: "PATIENT",
    organizationId: DEMO_ORG_ID,
    branchIds: [],
  },
};

export function getDemoUserByRole(role: Role): SessionUser | null {
  return DEMO_USERS[role] ?? null;
}

// ---------------------------------------------------------------------------
// Aggregations used by dashboards
// ---------------------------------------------------------------------------
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function getDashboardMetrics(scope?: { doctorId?: string; branchId?: string }): DashboardMetrics {
  let appts = appointments;
  if (scope?.doctorId) appts = appts.filter((a) => a.doctorId === scope.doctorId);
  if (scope?.branchId) appts = appts.filter((a) => a.branchId === scope.branchId);

  const todayAppts = appts.filter((a) => isToday(a.scheduledStart));
  const todayInvoices = invoices.filter((i) => isToday(i.createdAt) && (!scope?.branchId || i.branchId === scope.branchId));

  const now = new Date();
  return {
    todayAppointments: todayAppts.length,
    upcomingAppointments: appts.filter((a) => new Date(a.scheduledStart) > now && ["SCHEDULED", "CONFIRMED"].includes(a.status)).length,
    pendingFollowUps: prescriptions.filter((p) => p.followUpDate && new Date(p.followUpDate) > now && (!scope?.doctorId || p.doctorId === scope.doctorId)).length,
    todayCollection: todayInvoices.reduce((sum, i) => sum + i.paidAmount, 0),
    todayPatients: new Set(todayAppts.map((a) => a.patientId)).size,
    monthRevenue: 486500,
    lowStockCount: medicines.filter((m) => m.stockQty <= m.reorderLevel).length,
    noShowCount: todayAppts.filter((a) => a.status === "NO_SHOW").length,
  };
}

export function getRevenueTrend(): TrendPoint[] {
  return [
    { label: "Mon", value: 42000 }, { label: "Tue", value: 38500 }, { label: "Wed", value: 51200 },
    { label: "Thu", value: 47800 }, { label: "Fri", value: 62300 }, { label: "Sat", value: 71500 }, { label: "Sun", value: 28900 },
  ];
}

export function getAppointmentTrend(): TrendPoint[] {
  return [
    { label: "Mon", value: 34 }, { label: "Tue", value: 29 }, { label: "Wed", value: 41 },
    { label: "Thu", value: 38 }, { label: "Fri", value: 52 }, { label: "Sat", value: 60 }, { label: "Sun", value: 18 },
  ];
}

export function getPatientGrowthTrend(): TrendPoint[] {
  return [
    { label: "Feb", value: 210 }, { label: "Mar", value: 265 }, { label: "Apr", value: 312 },
    { label: "May", value: 358 }, { label: "Jun", value: 402 }, { label: "Jul", value: 471 }, { label: "Aug", value: 508 },
  ];
}

export function getStatusBreakdown(): TrendPoint[] {
  const map = new Map<string, number>();
  for (const a of appointments.filter((x) => isToday(x.scheduledStart))) {
    map.set(a.status, (map.get(a.status) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}
