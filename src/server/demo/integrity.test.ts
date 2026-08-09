import { describe, it, expect, beforeAll } from "vitest";
import {
  appointments,
  branches,
  doctors,
  invoices,
  patients,
  prescriptions,
  receptionists,
  medicines,
} from "./data";
import { consentForms, patientInsurances } from "./extra";
import { listAppointments } from "@/server/services/appointments.service";
import { listInvoices, getBillingSummary } from "@/server/services/billing.service";
import { getPatientBundle } from "@/server/services/patients.service";
import { db } from "@/server/repositories";
import type { SessionUser } from "@/lib/session";
import type { Appointment, Branch, Doctor, Patient, Receptionist } from "@/types/domain";

const primaryBranch = branches[0];
const primaryDoctor = doctors[0];
const primaryPatient = patients[0];

// The demo dataset is a clean, single-branch/single-doctor slate (Dr.
// Bhosikar's Rheumatology Clinic). The scoping tests below need a second
// branch/doctor/patient to prove the RBAC filters actually filter, rather
// than trivially passing on a single row — inserted as fixtures for this
// test file only.
const secondBranch: Branch = {
  id: "br_integrity_test_2",
  code: "IT2",
  name: "Integrity Test Branch",
  city: "Test City",
  phone: null,
  email: null,
  gstNumber: null,
  isActive: true,
};
const secondDoctor: Doctor = {
  id: "doc_integrity_test_2",
  userId: "usr_doc_integrity_test_2",
  fullName: "Dr. Integrity Two",
  email: "doc.integrity2@example.com",
  specialization: "General Medicine",
  department: "General",
  registrationNo: null,
  qualifications: null,
  consultationFee: 0,
  branchIds: [secondBranch.id],
  isActive: true,
};
const secondPatient: Patient = {
  id: "pat_integrity_test_2",
  mrn: "TST-I002",
  firstName: "Integrity",
  lastName: "Two",
  fullName: "Integrity Two",
  gender: "UNDISCLOSED",
  dateOfBirth: null,
  bloodGroup: "UNKNOWN",
  phone: "+91 00000 30003",
  email: null,
  city: null,
  allergies: null,
  chronicDiseases: null,
  createdAt: new Date().toISOString(),
  lastVisitAt: null,
  isActive: true,
};
const receptionistFixture: Receptionist = {
  id: "rec_integrity_test_1",
  userId: "usr_rec_integrity_test_1",
  fullName: "Reception Integrity",
  email: "rec.integrity@example.com",
  branchId: primaryBranch.id,
  employeeCode: null,
  isActive: true,
};

function apptFixture(over: Partial<Appointment>): Appointment {
  return {
    id: `apt_integrity_${Math.random().toString(36).slice(2, 8)}`,
    branchId: primaryBranch.id,
    branchName: primaryBranch.name,
    patientId: primaryPatient.id,
    patientName: primaryPatient.fullName,
    patientMrn: primaryPatient.mrn,
    doctorId: primaryDoctor.id,
    doctorName: primaryDoctor.fullName,
    type: "SCHEDULED",
    status: "CONFIRMED",
    scheduledStart: new Date(Date.now() + 3_600_000).toISOString(),
    scheduledEnd: new Date(Date.now() + 5_400_000).toISOString(),
    tokenNumber: 1,
    reason: null,
    paymentStatus: "UNPAID",
    ...over,
  };
}

beforeAll(async () => {
  await db.branches.insert(secondBranch);
  await db.doctors.insert(secondDoctor);
  await db.patients.insert(secondPatient);
  await db.receptionists.insert(receptionistFixture);

  await db.appointments.insert(apptFixture({}));
  await db.appointments.insert(
    apptFixture({
      id: "apt_integrity_second",
      branchId: secondBranch.id,
      branchName: secondBranch.name,
      doctorId: secondDoctor.id,
      doctorName: secondDoctor.fullName,
      patientId: secondPatient.id,
      patientName: secondPatient.fullName,
      patientMrn: secondPatient.mrn,
    }),
  );

  await db.prescriptions.insert({
    id: "rx_integrity_test_1",
    patientId: primaryPatient.id,
    patientName: primaryPatient.fullName,
    doctorId: primaryDoctor.id,
    doctorName: primaryDoctor.fullName,
    branchId: primaryBranch.id,
    diagnoses: ["Rheumatoid Arthritis"],
    symptoms: "Joint pain",
    medicines: [
      { name: "Methotrexate 7.5mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 30, instructions: null },
    ],
    investigations: [],
    advice: null,
    followUpDate: null,
    createdAt: new Date().toISOString(),
  });

  await db.invoices.insert({
    id: "inv_integrity_test_1",
    number: "INV-IT-0001",
    branchId: primaryBranch.id,
    patientId: primaryPatient.id,
    patientName: primaryPatient.fullName,
    status: "ISSUED",
    paymentStatus: "PARTIAL",
    items: [{ description: "Consultation", quantity: 1, unitPrice: 500, lineTotal: 500 }],
    subtotal: 500,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 500,
    paidAmount: 200,
    balanceAmount: 300,
    createdAt: new Date().toISOString(),
  });

  await db.consentForms.insert({
    id: "cf_integrity_test_1",
    patientId: primaryPatient.id,
    patientName: primaryPatient.fullName,
    doctorId: primaryDoctor.id,
    doctorName: primaryDoctor.fullName,
    title: "Integrity test consent",
    body: "Consent body text for the integrity test fixture.",
    status: "PENDING",
    createdBy: "Test",
    updatedAt: new Date().toISOString(),
  });
});

describe("demo data referential integrity", () => {
  it("every appointment references valid patient, doctor and branch", () => {
    const patientIds = new Set(patients.map((p) => p.id));
    const doctorIds = new Set(doctors.map((d) => d.id));
    const branchIds = new Set(branches.map((b) => b.id));
    for (const a of appointments) {
      expect(patientIds.has(a.patientId), `appt ${a.id} patient`).toBe(true);
      expect(doctorIds.has(a.doctorId), `appt ${a.id} doctor`).toBe(true);
      expect(branchIds.has(a.branchId), `appt ${a.id} branch`).toBe(true);
      expect(new Date(a.scheduledEnd).getTime()).toBeGreaterThan(new Date(a.scheduledStart).getTime());
    }
  });

  it("every prescription references a valid patient and doctor", () => {
    const patientIds = new Set(patients.map((p) => p.id));
    const doctorIds = new Set(doctors.map((d) => d.id));
    for (const p of prescriptions) {
      expect(patientIds.has(p.patientId), `rx ${p.id} patient`).toBe(true);
      expect(doctorIds.has(p.doctorId), `rx ${p.id} doctor`).toBe(true);
      expect(p.medicines.length).toBeGreaterThan(0);
    }
  });

  it("invoice totals are internally consistent", () => {
    const patientIds = new Set(patients.map((p) => p.id));
    for (const inv of invoices) {
      expect(patientIds.has(inv.patientId), `inv ${inv.number} patient`).toBe(true);
      const itemsTotal = inv.items.reduce((s, it) => s + it.lineTotal, 0);
      expect(itemsTotal).toBe(inv.subtotal);
      expect(inv.balanceAmount).toBeCloseTo(inv.totalAmount - inv.paidAmount, 2);
    }
  });

  it("receptionists and consent/insurance reference valid entities", () => {
    const patientIds = new Set(patients.map((p) => p.id));
    const branchIds = new Set(branches.map((b) => b.id));
    for (const r of receptionists) expect(branchIds.has(r.branchId)).toBe(true);
    for (const c of consentForms) expect(patientIds.has(c.patientId)).toBe(true);
    for (const pi of patientInsurances) expect(patientIds.has(pi.patientId)).toBe(true);
  });

  it("medicines have sane reorder levels", () => {
    for (const m of medicines) {
      expect(m.reorderLevel).toBeGreaterThan(0);
      expect(m.stockQty).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("service scoping (RBAC data isolation)", () => {
  it("doctor sees only their own appointments", async () => {
    const doctorUser: SessionUser = {
      id: primaryDoctor.userId,
      fullName: primaryDoctor.fullName,
      email: primaryDoctor.email,
      role: "DOCTOR",
      organizationId: "org_test",
      branchId: primaryBranch.id,
      branchIds: [primaryBranch.id],
      linkId: primaryDoctor.id,
    };
    const rows = await listAppointments(doctorUser, { range: "all" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((a) => a.doctorId === primaryDoctor.id)).toBe(true);
  });

  it("receptionist sees only their branch's appointments", async () => {
    const recUser: SessionUser = {
      id: receptionistFixture.userId,
      fullName: receptionistFixture.fullName,
      email: receptionistFixture.email,
      role: "RECEPTIONIST",
      organizationId: "org_test",
      branchId: receptionistFixture.branchId,
      branchIds: [receptionistFixture.branchId],
      linkId: receptionistFixture.id,
    };
    const rows = await listAppointments(recUser, { range: "all" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((a) => a.branchId === primaryBranch.id)).toBe(true);
  });

  it("admin sees appointments across branches", async () => {
    const adminUser: SessionUser = {
      id: "usr_admin_test",
      fullName: "Admin",
      email: "admin@test.local",
      role: "ADMIN",
      organizationId: "org_test",
      branchIds: branches.map((b) => b.id),
    };
    const rows = await listAppointments(adminUser, { range: "all" });
    const uniqueBranches = new Set(rows.map((a) => a.branchId));
    expect(uniqueBranches.size).toBeGreaterThan(1);
  });

  it("receptionist billing is branch-scoped and summary adds up", async () => {
    const recUser: SessionUser = {
      id: receptionistFixture.userId,
      fullName: receptionistFixture.fullName,
      email: receptionistFixture.email,
      role: "RECEPTIONIST",
      organizationId: "org_test",
      branchId: receptionistFixture.branchId,
      branchIds: [receptionistFixture.branchId],
      linkId: receptionistFixture.id,
    };
    const rows = await listInvoices(recUser);
    expect(rows.every((i) => i.branchId === primaryBranch.id)).toBe(true);
    const summary = await getBillingSummary(recUser);
    expect(summary.outstanding).toBeCloseTo(rows.reduce((s, i) => s + i.balanceAmount, 0), 2);
  });

  it("patient bundle returns related records or null", async () => {
    const bundle = await getPatientBundle(primaryPatient.id);
    expect(bundle).not.toBeNull();
    expect(bundle!.appointments.every((a) => a.patientId === primaryPatient.id)).toBe(true);
    expect(await getPatientBundle("does_not_exist")).toBeNull();
  });
});
