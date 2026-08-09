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
    email: "doctor@bhosikarrheumatology.in", // PLACEHOLDER — confirm real email
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
// Patients — clean slate; real patients are registered via reception/portal.
// One clearly-labeled demo patient is seeded so the hidden dev-only demo
// login for the PATIENT role has something to resolve against. It only
// exists in this in-memory demo array (dataMode="demo"), never in MongoDB.
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
];

// ---------------------------------------------------------------------------
// Appointments — clean slate
// ---------------------------------------------------------------------------
export const appointments: Appointment[] = [];

// ---------------------------------------------------------------------------
// Prescriptions — clean slate
// ---------------------------------------------------------------------------
export const prescriptions: Prescription[] = [];

// ---------------------------------------------------------------------------
// Invoices — clean slate
// ---------------------------------------------------------------------------
export const invoices: Invoice[] = [];

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
    email: "doctor@bhosikarrheumatology.in",
    role: "DOCTOR",
    organizationId: DEMO_ORG_ID,
    branchId: "br_ravet",
    branchIds: ["br_ravet"],
    linkId: "doc_bhosikar",
  },
  RECEPTIONIST: {
    id: "usr_rec_demo",
    fullName: "Reception (demo)",
    email: "reception@bhosikarrheumatology.in",
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
