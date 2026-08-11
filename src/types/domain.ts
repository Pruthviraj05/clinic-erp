/**
 * Domain view-types used across the UI and service layer.
 *
 * These mirror the Prisma models but are decoupled from the generated client so
 * components never import DB internals. Repositories map Prisma rows -> these.
 */
import type { Role } from "@/lib/rbac";

export type AppointmentType =
  | "SCHEDULED"
  | "WALK_IN"
  | "FOLLOW_UP"
  | "EMERGENCY";

/** How the appointment was booked — distinct from `type`, which is the consultation kind. */
export type BookingSource = "PHONE" | "WALK_IN" | "WEBSITE" | "REFERRAL";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "RESCHEDULED";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED" | "WAIVED";

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED"
  | "REFUNDED";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED";

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  isActive: boolean;
}

export interface Doctor {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  specialization: string | null;
  department: string | null;
  registrationNo: string | null;
  qualifications: string | null;
  consultationFee: number;
  branchIds: string[];
  isActive: boolean;
}

export interface Receptionist {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  branchId: string;
  employeeCode: string | null;
  isActive: boolean;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  gender: Gender;
  dateOfBirth: string | null;
  bloodGroup: string;
  phone: string;
  email: string | null;
  city: string | null;
  allergies: string | null;
  chronicDiseases: string | null;
  createdAt: string;
  lastVisitAt: string | null;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  branchId: string;
  branchName: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  type: AppointmentType;
  status: AppointmentStatus;
  /** How this appointment was booked. Optional so pre-existing rows without it still typecheck. */
  source?: BookingSource;
  scheduledStart: string;
  scheduledEnd: string;
  tokenNumber: number | null;
  reason: string | null;
  paymentStatus: PaymentStatus;
}

export interface PrescriptionMedicine {
  name: string;
  dosage: string | null;
  frequency: string | null;
  timing: string | null;
  durationDays: number | null;
  instructions: string | null;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  branchId: string;
  diagnoses: string[];
  symptoms: string | null;
  medicines: PrescriptionMedicine[];
  investigations: string[];
  advice: string | null;
  followUpDate: string | null;
  createdAt: string;
  vitals?: {
    heightCm?: number;
    weightKg?: number;
    bp?: string;
    pulse?: number;
    tempC?: number;
    spo2?: number;
  };
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  number: string;
  branchId: string;
  patientId: string;
  patientName: string;
  /** Which letterhead this prints with. Optional: older rows default to CONSULTATION. */
  invoiceKind?: "PHARMACY" | "CONSULTATION";
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  createdAt: string;
}

/**
 * Schedule classification under the Drugs and Cosmetics Rules. H and H1 may
 * only be dispensed against a prescription; H1 additionally requires a
 * separate register recording the prescriber and patient.
 */
export type MedicineSchedule = "OTC" | "H" | "H1" | "X";

export interface Medicine {
  id: string;
  name: string;
  genericName: string | null;
  category: string | null;
  brand: string | null;
  unit: string;
  /** Minimum — at or below this the item needs reordering. */
  reorderLevel: number;
  /**
   * Target level to restock up to. Without it there is no way to answer "how
   * many should I order?" — only "should I order?". Falls back to 3× the
   * reorder level when unset.
   */
  maxLevel?: number | null;
  /**
   * Total across all batches. Kept as a maintained aggregate so list screens
   * and low-stock checks stay a single read — `medicineBatches` is the
   * authoritative detail, and every stock movement updates both together.
   */
  stockQty: number;
  sellPrice: number;
  /** Earliest expiry among batches still holding stock. Derived, not entered. */
  nearestExpiry: string | null;
  isActive: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
  /** Printed maximum retail price — the ceiling we may legally charge. */
  mrp?: number | null;
  /** Latest purchase price (PTR), for margin reporting. */
  costPrice?: number | null;
  /** Per-item GST slab. Pharma spans 5/12/18%, so a flat rate mis-bills. */
  gstRate?: number;
  hsnCode?: string | null;
  /** Physical shelf/rack, so staff can actually find the box. */
  rackLocation?: string | null;
  schedule?: MedicineSchedule;
}

/**
 * A single received lot of a medicine.
 *
 * Stock has to be tracked per batch, not as one number: a recall targets a
 * batch, expiry is a property of a batch, and cost varies between purchases.
 * Dispensing draws from the batch expiring soonest (FEFO).
 */
export interface MedicineBatch {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNo: string;
  /** ISO date; null when the supplier bill did not state one. */
  expiry: string | null;
  /** Units remaining in this lot. */
  quantity: number;
  /** Units originally received, so consumption is visible. */
  receivedQty: number;
  /** Price to retailer — what we paid per unit. */
  costPrice: number;
  mrp: number;
  supplierName?: string | null;
  purchaseBillNo?: string | null;
  receivedAt: string;
  receivedBy: string;
}

export type StockMovementType = "IN" | "OUT" | "ADJUST" | "SALE";

export interface StockMovementItem {
  id: string;
  medicineId: string;
  medicineName: string;
  type: StockMovementType;
  /** Signed: positive = added, negative = removed. */
  quantity: number;
  balanceAfter: number;
  reason: string;
  by: string;
  at: string;
  /** Supplier bill/invoice photo for a stock-in, as a base64 data URL. */
  billPhotoDataUrl?: string;
  /** The lot this movement touched — a recall needs to trace dispensing. */
  batchId?: string;
  batchNo?: string;
  expiry?: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  read: boolean;
  /** Targets one user (their SessionUser.linkId). Absent = broadcast to everyone. */
  recipientId?: string;
  /** Where clicking the notification should navigate, if anywhere. */
  actionUrl?: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

/** Aggregated numbers for dashboard KPI tiles. */
export interface DashboardMetrics {
  todayAppointments: number;
  upcomingAppointments: number;
  pendingFollowUps: number;
  todayCollection: number;
  todayPatients: number;
  monthRevenue: number;
  lowStockCount: number;
  noShowCount: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface SessionUserShape {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  organizationId: string;
  branchId?: string;
  branchIds: string[];
}
