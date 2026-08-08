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

export interface Medicine {
  id: string;
  name: string;
  genericName: string | null;
  category: string | null;
  brand: string | null;
  unit: string;
  reorderLevel: number;
  stockQty: number;
  sellPrice: number;
  nearestExpiry: string | null;
  isActive: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
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
