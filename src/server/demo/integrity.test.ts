import { describe, it, expect } from "vitest";
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
import type { SessionUser } from "@/lib/session";

const patientIds = new Set(patients.map((p) => p.id));
const doctorIds = new Set(doctors.map((d) => d.id));
const branchIds = new Set(branches.map((b) => b.id));

const adminUser: SessionUser = { id: "usr_admin", fullName: "Admin", email: "a@x.com", role: "ADMIN", organizationId: "org", branchIds: [...branchIds] };
const doctorUser: SessionUser = { id: "usr_doc_mehta", fullName: "Dr. Ananya Mehta", email: "d@x.com", role: "DOCTOR", organizationId: "org", branchId: "br_central", branchIds: ["br_central", "br_hsr"] };
const recUser: SessionUser = { id: "usr_rec_sana", fullName: "Sana", email: "r@x.com", role: "RECEPTIONIST", organizationId: "org", branchId: "br_central", branchIds: ["br_central"] };

describe("demo data referential integrity", () => {
  it("every appointment references valid patient, doctor and branch", () => {
    for (const a of appointments) {
      expect(patientIds.has(a.patientId), `appt ${a.id} patient`).toBe(true);
      expect(doctorIds.has(a.doctorId), `appt ${a.id} doctor`).toBe(true);
      expect(branchIds.has(a.branchId), `appt ${a.id} branch`).toBe(true);
      expect(new Date(a.scheduledEnd).getTime()).toBeGreaterThan(new Date(a.scheduledStart).getTime());
    }
  });

  it("every prescription references a valid patient and doctor", () => {
    for (const p of prescriptions) {
      expect(patientIds.has(p.patientId), `rx ${p.id} patient`).toBe(true);
      expect(doctorIds.has(p.doctorId), `rx ${p.id} doctor`).toBe(true);
      expect(p.medicines.length).toBeGreaterThan(0);
    }
  });

  it("invoice totals are internally consistent", () => {
    for (const inv of invoices) {
      expect(patientIds.has(inv.patientId), `inv ${inv.number} patient`).toBe(true);
      const itemsTotal = inv.items.reduce((s, it) => s + it.lineTotal, 0);
      expect(itemsTotal).toBe(inv.subtotal);
      expect(inv.balanceAmount).toBeCloseTo(inv.totalAmount - inv.paidAmount, 2);
    }
  });

  it("receptionists and consent/insurance reference valid entities", () => {
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
    const rows = await listAppointments(doctorUser, { range: "all" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((a) => a.doctorId === "doc_mehta")).toBe(true);
  });

  it("receptionist sees only their branch's appointments", async () => {
    const rows = await listAppointments(recUser, { range: "all" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((a) => a.branchId === "br_central")).toBe(true);
  });

  it("admin sees appointments across branches", async () => {
    const rows = await listAppointments(adminUser, { range: "all" });
    const uniqueBranches = new Set(rows.map((a) => a.branchId));
    expect(uniqueBranches.size).toBeGreaterThan(1);
  });

  it("receptionist billing is branch-scoped and summary adds up", async () => {
    const rows = await listInvoices(recUser);
    expect(rows.every((i) => i.branchId === "br_central")).toBe(true);
    const summary = await getBillingSummary(recUser);
    expect(summary.outstanding).toBeCloseTo(rows.reduce((s, i) => s + i.balanceAmount, 0), 2);
  });

  it("patient bundle returns related records or null", async () => {
    const bundle = await getPatientBundle("pat_arjun");
    expect(bundle).not.toBeNull();
    expect(bundle!.appointments.every((a) => a.patientId === "pat_arjun")).toBe(true);
    expect(await getPatientBundle("does_not_exist")).toBeNull();
  });
});
