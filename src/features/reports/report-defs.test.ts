import { describe, it, expect } from "vitest";
import { buildReport, type ReportContext } from "./report-defs";
import type { Appointment, Branch, Doctor, Invoice, Patient, StockMovementItem } from "@/types/domain";

/**
 * Pure-function tests for the report builder — no server/db mocking needed,
 * just real data shapes filtered through buildReport().
 */

const branchA: Branch = { id: "b1", code: "A", name: "Branch A", city: "Pune", phone: null, email: null, gstNumber: null, isActive: true };
const branchB: Branch = { id: "b2", code: "B", name: "Branch B", city: "Mumbai", phone: null, email: null, gstNumber: null, isActive: true };

const doctorA: Doctor = {
  id: "d1", userId: "u1", fullName: "Dr. A", email: "a@x.com", specialization: "Rheum",
  department: null, registrationNo: null, qualifications: null, consultationFee: 500,
  branchIds: ["b1"], isActive: true,
};
const doctorB: Doctor = {
  id: "d2", userId: "u2", fullName: "Dr. B", email: "b@x.com", specialization: "Ortho",
  department: null, registrationNo: null, qualifications: null, consultationFee: 700,
  branchIds: ["b2"], isActive: true,
};

function invoice(over: Partial<Invoice>): Invoice {
  return {
    id: "inv1", number: "INV-1", branchId: "b1", patientId: "p1", patientName: "Patient X",
    invoiceKind: "CONSULTATION", status: "PAID", paymentStatus: "PAID",
    items: [], subtotal: 100, discountAmount: 0, taxAmount: 0, totalAmount: 100,
    paidAmount: 100, balanceAmount: 0, createdAt: "2026-06-15T10:00:00.000Z",
    ...over,
  };
}

function appointment(over: Partial<Appointment>): Appointment {
  return {
    id: "apt1", branchId: "b1", branchName: "Branch A", patientId: "p1", patientName: "Patient X",
    patientMrn: "MRN-1", doctorId: "d1", doctorName: "Dr. A", type: "SCHEDULED", status: "COMPLETED",
    scheduledStart: "2026-06-15T10:00:00.000Z", scheduledEnd: "2026-06-15T10:30:00.000Z",
    tokenNumber: 1, reason: null, paymentStatus: "PAID",
    ...over,
  };
}

function patient(over: Partial<Patient>): Patient {
  return {
    id: "p1", mrn: "MRN-1", firstName: "Patient", lastName: "X", fullName: "Patient X",
    gender: "UNDISCLOSED", dateOfBirth: null, bloodGroup: "UNKNOWN", phone: "+91 0",
    email: null, city: null, allergies: null, chronicDiseases: null,
    createdAt: "2026-06-15T10:00:00.000Z", lastVisitAt: null, isActive: true,
    ...over,
  };
}

function movement(over: Partial<StockMovementItem>): StockMovementItem {
  return {
    id: "m1", medicineId: "med1", medicineName: "Paracetamol", type: "SALE",
    quantity: -10, balanceAfter: 90, reason: "Sale", by: "Reception", at: "2026-06-15T10:00:00.000Z",
    ...over,
  };
}

const emptyCtx: ReportContext = { invoices: [], appointments: [], patients: [], stockMovements: [], doctors: [], branches: [] };
const noFilter = { from: "", to: "", branchId: "", doctorId: "" };

describe("buildReport — revenue", () => {
  it("filters by date range and totals paid amount", () => {
    const ctx: ReportContext = {
      ...emptyCtx,
      branches: [branchA],
      invoices: [
        invoice({ id: "in1", createdAt: "2026-06-10T10:00:00.000Z", paidAmount: 100 }),
        invoice({ id: "in2", createdAt: "2026-06-20T10:00:00.000Z", paidAmount: 200 }),
        invoice({ id: "in3", createdAt: "2026-07-01T10:00:00.000Z", paidAmount: 300 }),
      ],
    };
    const res = buildReport("revenue", ctx, { ...noFilter, from: "2026-06-01", to: "2026-06-30" });
    expect(res.rows).toHaveLength(2);
    expect(res.totalValue).toBe(300);
    expect(res.totalIsCurrency).toBe(true);
  });

  it("filters by branch", () => {
    const ctx: ReportContext = {
      ...emptyCtx,
      branches: [branchA, branchB],
      invoices: [
        invoice({ id: "in1", branchId: "b1", paidAmount: 100 }),
        invoice({ id: "in2", branchId: "b2", paidAmount: 250 }),
      ],
    };
    const res = buildReport("revenue", ctx, { ...noFilter, branchId: "b2" });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].Branch).toBe("Branch B");
    expect(res.totalValue).toBe(250);
  });

  it("resolves unknown branch ids to an em dash rather than crashing", () => {
    const ctx: ReportContext = { ...emptyCtx, branches: [], invoices: [invoice({ branchId: "ghost" })] };
    const res = buildReport("revenue", ctx, noFilter);
    expect(res.rows[0].Branch).toBe("—");
  });
});

describe("buildReport — doctor performance", () => {
  it("counts only COMPLETED appointments as consultations", () => {
    const ctx: ReportContext = {
      ...emptyCtx,
      doctors: [doctorA],
      appointments: [
        appointment({ id: "a1", doctorId: "d1", status: "COMPLETED" }),
        appointment({ id: "a2", doctorId: "d1", status: "SCHEDULED" }),
        appointment({ id: "a3", doctorId: "d1", status: "CANCELLED" }),
      ],
    };
    const res = buildReport("doctor", ctx, noFilter);
    expect(res.rows[0].Consultations).toBe(1);
  });

  it("splits branch revenue evenly when doctors share a branch", () => {
    const sharedDoctorB: Doctor = { ...doctorB, branchIds: ["b1"] };
    const ctx: ReportContext = {
      ...emptyCtx,
      doctors: [doctorA, sharedDoctorB],
      invoices: [invoice({ branchId: "b1", paidAmount: 1000 })],
    };
    const res = buildReport("doctor", ctx, noFilter);
    const revenueByDoctor = new Map(res.rows.map((r) => [r.Doctor, r.Revenue]));
    expect(revenueByDoctor.get("Dr. A")).toBe(500);
    expect(revenueByDoctor.get("Dr. B")).toBe(500);
  });

  it("filters to one doctor", () => {
    const ctx: ReportContext = { ...emptyCtx, doctors: [doctorA, doctorB] };
    const res = buildReport("doctor", ctx, { ...noFilter, doctorId: "d1" });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].Doctor).toBe("Dr. A");
  });
});

describe("buildReport — branch revenue", () => {
  it("counts invoices and sums revenue per branch", () => {
    const ctx: ReportContext = {
      ...emptyCtx,
      branches: [branchA, branchB],
      invoices: [
        invoice({ id: "in1", branchId: "b1", paidAmount: 100 }),
        invoice({ id: "in2", branchId: "b1", paidAmount: 50 }),
        invoice({ id: "in3", branchId: "b2", paidAmount: 200 }),
      ],
    };
    const res = buildReport("branch", ctx, noFilter);
    const row = res.rows.find((r) => r.Branch === "Branch A")!;
    expect(row.Invoices).toBe(2);
    expect(row.Revenue).toBe(150);
    expect(res.totalValue).toBe(350);
  });
});

describe("buildReport — patient growth", () => {
  it("marks a patient Returning only when lastVisitAt differs from createdAt", () => {
    const ctx: ReportContext = {
      ...emptyCtx,
      patients: [
        patient({ id: "p1", createdAt: "2026-06-01T00:00:00.000Z", lastVisitAt: "2026-06-01T00:00:00.000Z" }),
        patient({ id: "p2", createdAt: "2026-06-01T00:00:00.000Z", lastVisitAt: "2026-07-01T00:00:00.000Z" }),
        patient({ id: "p3", createdAt: "2026-06-01T00:00:00.000Z", lastVisitAt: null }),
      ],
    };
    const res = buildReport("patients", ctx, noFilter);
    const statuses = res.rows.map((r) => r.Status);
    expect(statuses).toEqual(["New", "Returning", "New"]);
    expect(res.totalValue).toBe(3);
  });

  it("filters registrations by date range", () => {
    const ctx: ReportContext = {
      ...emptyCtx,
      patients: [
        patient({ id: "p1", createdAt: "2026-05-01T00:00:00.000Z" }),
        patient({ id: "p2", createdAt: "2026-06-15T00:00:00.000Z" }),
      ],
    };
    const res = buildReport("patients", ctx, { ...noFilter, from: "2026-06-01", to: "2026-06-30" });
    expect(res.rows).toHaveLength(1);
  });
});

describe("buildReport — medicine consumption", () => {
  it("includes only OUT/SALE movements and reports absolute quantity", () => {
    const ctx: ReportContext = {
      ...emptyCtx,
      stockMovements: [
        movement({ id: "m1", type: "SALE", quantity: -10 }),
        movement({ id: "m2", type: "OUT", quantity: -5 }),
        movement({ id: "m3", type: "IN", quantity: 20 }),
        movement({ id: "m4", type: "ADJUST", quantity: -2 }),
      ],
    };
    const res = buildReport("medicine", ctx, noFilter);
    expect(res.rows).toHaveLength(2);
    expect(res.rows.every((r) => (r.Quantity as number) > 0)).toBe(true);
    expect(res.totalValue).toBe(15);
  });
});

describe("buildReport — no-show & follow-ups", () => {
  it("includes NO_SHOW status or FOLLOW_UP type, not both required", () => {
    const ctx: ReportContext = {
      ...emptyCtx,
      appointments: [
        appointment({ id: "a1", status: "NO_SHOW", type: "SCHEDULED" }),
        appointment({ id: "a2", status: "SCHEDULED", type: "FOLLOW_UP" }),
        appointment({ id: "a3", status: "COMPLETED", type: "SCHEDULED" }),
      ],
    };
    const res = buildReport("noshow", ctx, noFilter);
    expect(res.rows).toHaveLength(2);
  });

  it("filters by doctor", () => {
    const ctx: ReportContext = {
      ...emptyCtx,
      appointments: [
        appointment({ id: "a1", status: "NO_SHOW", doctorId: "d1" }),
        appointment({ id: "a2", status: "NO_SHOW", doctorId: "d2" }),
      ],
    };
    const res = buildReport("noshow", ctx, { ...noFilter, doctorId: "d2" });
    expect(res.rows).toHaveLength(1);
  });
});
