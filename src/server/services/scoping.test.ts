import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Invoice, Prescription } from "@/types/domain";
import type { SessionUser } from "@/lib/session";

/**
 * Regression tests for cross-patient / cross-doctor data leaks.
 *
 * These all guard the same rule: scoping must FAIL CLOSED. An account with a
 * missing or mismatched link must see nothing, never the whole clinic.
 */
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn) => fn }));

const { listPrescriptions, getPrescription } = await import("./prescriptions.service");
const { listInvoices } = await import("./billing.service");
const { db } = await import("@/server/repositories");

function user(role: SessionUser["role"], linkId?: string): SessionUser {
  return {
    id: `usr_${role}`,
    fullName: `${role} user`,
    email: `${role}@example.com`,
    role,
    organizationId: "org_test",
    branchIds: [],
    linkId,
  };
}

const rxA: Prescription = {
  id: "rx_scope_a",
  patientId: "pat_scope_a",
  patientName: "Patient A",
  doctorId: "doc_scope_a",
  doctorName: "Doctor A",
  branchId: "br_ravet",
  diagnoses: ["Gout"],
  symptoms: null,
  medicines: [],
  investigations: [],
  advice: null,
  followUpDate: null,
  createdAt: new Date().toISOString(),
};
const rxB: Prescription = { ...rxA, id: "rx_scope_b", patientId: "pat_scope_b", patientName: "Patient B", doctorId: "doc_scope_b", doctorName: "Doctor B" };

const invA: Invoice = {
  id: "inv_scope_a",
  number: "INV-SCOPE-A",
  branchId: "br_ravet",
  patientId: "pat_scope_a",
  patientName: "Patient A",
  status: "PAID",
  paymentStatus: "PAID",
  items: [],
  subtotal: 0,
  discountAmount: 0,
  taxAmount: 0,
  totalAmount: 0,
  paidAmount: 0,
  balanceAmount: 0,
  createdAt: new Date().toISOString(),
};
const invB: Invoice = { ...invA, id: "inv_scope_b", number: "INV-SCOPE-B", patientId: "pat_scope_b", patientName: "Patient B" };

beforeAll(async () => {
  await db.prescriptions.insert(rxA);
  await db.prescriptions.insert(rxB);
  await db.invoices.insert(invA);
  await db.invoices.insert(invB);
});

describe("prescription scoping", () => {
  it("shows a patient only their own prescriptions", async () => {
    const rows = await listPrescriptions(user("PATIENT", "pat_scope_a"));
    expect(rows.every((r) => r.patientId === "pat_scope_a")).toBe(true);
    expect(rows.some((r) => r.id === "rx_scope_b")).toBe(false);
  });

  it("ignores a patientId a patient tries to supply for someone else", async () => {
    const rows = await listPrescriptions(user("PATIENT", "pat_scope_a"), "pat_scope_b");
    expect(rows).toHaveLength(0);
  });

  it("returns nothing when a patient account has no link", async () => {
    expect(await listPrescriptions(user("PATIENT", undefined))).toHaveLength(0);
  });

  it("shows a doctor only their own prescriptions", async () => {
    const rows = await listPrescriptions(user("DOCTOR", "doc_scope_a"));
    expect(rows.some((r) => r.id === "rx_scope_b")).toBe(false);
  });

  it("returns nothing when a doctor account has no link", async () => {
    expect(await listPrescriptions(user("DOCTOR", undefined))).toHaveLength(0);
  });

  it("blocks a doctor from opening another doctor's prescription", async () => {
    expect(await getPrescription("rx_scope_b", user("DOCTOR", "doc_scope_a"))).toBeNull();
    expect(await getPrescription("rx_scope_a", user("DOCTOR", "doc_scope_a"))).not.toBeNull();
  });

  it("blocks a patient from opening another patient's prescription", async () => {
    expect(await getPrescription("rx_scope_b", user("PATIENT", "pat_scope_a"))).toBeNull();
  });

  it("lets an admin read across doctors", async () => {
    expect(await getPrescription("rx_scope_b", user("ADMIN"))).not.toBeNull();
  });
});

describe("invoice scoping", () => {
  it("shows a patient only their own invoices", async () => {
    const rows = await listInvoices(user("PATIENT", "pat_scope_a"));
    expect(rows.every((r) => r.patientId === "pat_scope_a")).toBe(true);
  });

  it("returns nothing when a patient account has no link", async () => {
    expect(await listInvoices(user("PATIENT", undefined))).toHaveLength(0);
  });

  it("ignores a patientId a patient tries to supply for someone else", async () => {
    expect(await listInvoices(user("PATIENT", "pat_scope_a"), "pat_scope_b")).toHaveLength(0);
  });
});
