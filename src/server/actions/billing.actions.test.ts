import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Medicine, Patient } from "@/types/domain";

/**
 * Pharmacy billing must keep inventory honest: every dispensed unit leaves
 * stock and leaves a SALE movement behind. These tests pin that behaviour —
 * it is the one place where billing and inventory have to agree.
 */
const currentRole = { value: "RECEPTIONIST" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "clinicore_role" ? { name, value: currentRole.value } : undefined),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn) => fn }));

const { createPharmacyBillAction, createConsultationInvoiceAction, saveBillDesignAction } = await import(
  "./billing.actions"
);
const { db } = await import("@/server/repositories");
const { receiveStock } = await import("@/server/demo/batch-store");
const { getBillDesignFor } = await import("@/server/demo/bill-design-store");

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

const patient: Patient = {
  id: "pat_bill_test",
  mrn: "TST-B001",
  firstName: "Bill",
  lastName: "Tester",
  fullName: "Bill Tester",
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

function med(id: string, stockQty: number, sellPrice = 10): Medicine {
  return {
    id,
    name: `Test Med ${id}`,
    genericName: null,
    category: "NSAID",
    brand: null,
    unit: "Tablet",
    reorderLevel: 5,
    stockQty,
    sellPrice,
    nearestExpiry: null,
    isActive: true,
  };
}

beforeAll(async () => {
  await db.patients.insert(patient);
  // Stock lives in batches now, so it has to be RECEIVED — inserting a
  // medicine with a bare stockQty leaves nothing for FEFO to draw from.
  for (const [id, qty, price] of [
    ["med_bill_a", 100, 20],
    ["med_bill_b", 3, 50],
    ["med_bill_c", 10, 15],
  ] as const) {
    await db.medicines.insert(med(id, 0, price));
    await receiveStock({
      medicineId: id,
      quantity: qty,
      batchNo: `B-${id}`,
      expiry: new Date(Date.now() + 200 * 86_400_000).toISOString(),
      costPrice: price * 0.7,
      mrp: price * 1.2,
      by: "Seed",
    });
  }
});

describe("createPharmacyBillAction", () => {
  it("deducts dispensed stock and logs a SALE movement", async () => {
    const res = await createPharmacyBillAction({
      patientId: patient.id,
      branchId: "br_ravet",
      items: [{ medicineId: "med_bill_a", quantity: 12 }],
    });

    expect(res.ok).toBe(true);
    expect((await db.medicines.get("med_bill_a"))!.stockQty).toBe(88);

    const moves = await db.stockMovements.list((m) => m.medicineId === "med_bill_a");
    const sale = moves.find((m) => m.type === "SALE")!;
    expect(sale).toBeDefined();
    expect(sale.quantity).toBe(-12); // signed: dispensing removes stock
    expect(sale.balanceAfter).toBe(88);
    expect(sale.reason).toContain(res.data!.number);
  });

  it("prices lines from the catalog and adds GST", async () => {
    const res = await createPharmacyBillAction({
      patientId: patient.id,
      branchId: "br_ravet",
      items: [{ medicineId: "med_bill_c", quantity: 2 }],
    });
    expect(res.ok).toBe(true);
    const inv = res.data!;
    expect(inv.items[0].unitPrice).toBe(15);
    expect(inv.subtotal).toBe(30);
    expect(inv.taxAmount).toBe(3.6); // 12% pharmacy GST
    expect(inv.totalAmount).toBe(33.6);
    expect(inv.balanceAmount).toBe(0);
  });

  it("refuses the whole bill when one line exceeds stock, leaving inventory untouched", async () => {
    const before = (await db.medicines.get("med_bill_a"))!.stockQty;
    const res = await createPharmacyBillAction({
      patientId: patient.id,
      branchId: "br_ravet",
      items: [
        { medicineId: "med_bill_a", quantity: 1 },
        { medicineId: "med_bill_b", quantity: 99 }, // only 3 in stock
      ],
    });

    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/insufficient stock/i);
    // The good line must NOT have been dispensed.
    expect((await db.medicines.get("med_bill_a"))!.stockQty).toBe(before);
    expect((await db.medicines.get("med_bill_b"))!.stockQty).toBe(3);
  });

  it("sums repeats of the same medicine before checking stock", async () => {
    // 2 + 2 = 4 against a stock of 3 — must fail, even though each line fits.
    const res = await createPharmacyBillAction({
      patientId: patient.id,
      branchId: "br_ravet",
      items: [
        { medicineId: "med_bill_b", quantity: 2 },
        { medicineId: "med_bill_b", quantity: 2 },
      ],
    });
    expect(res.ok).toBe(false);
    expect((await db.medicines.get("med_bill_b"))!.stockQty).toBe(3);
  });

  it("denies roles without billing rights", async () => {
    currentRole.value = "PATIENT";
    const res = await createPharmacyBillAction({
      patientId: patient.id,
      branchId: "br_ravet",
      items: [{ medicineId: "med_bill_a", quantity: 1 }],
    });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/permission/i);
    currentRole.value = "RECEPTIONIST";
  });

  it("stamps the bill as PHARMACY", async () => {
    const res = await createPharmacyBillAction({
      patientId: patient.id,
      branchId: "br_ravet",
      items: [{ medicineId: "med_bill_c", quantity: 1 }],
    });
    expect(res.ok).toBe(true);
    expect(res.data!.invoiceKind).toBe("PHARMACY");
  });
});

describe("createConsultationInvoiceAction", () => {
  it("stamps the invoice as CONSULTATION", async () => {
    currentRole.value = "RECEPTIONIST";
    const res = await createConsultationInvoiceAction(
      null,
      fd({
        patientId: patient.id,
        branchId: "br_ravet",
        doctorId: "doc_bhosikar",
        amount: "500",
        gstRate: "0.18",
        payment: "PAID_FULL",
      }),
    );
    expect(res.ok).toBe(true);
    expect(res.data!.invoiceKind).toBe("CONSULTATION");
    expect(res.data!.status).toBe("PAID");
  });
});

describe("saveBillDesignAction", () => {
  it("saves the pharmacy and consultation letterheads independently", async () => {
    currentRole.value = "ADMIN";
    const pharmacyRes = await saveBillDesignAction({
      kind: "PHARMACY",
      documentTitle: "PHARMACY RECEIPT",
      headerNote: "",
      footerNote: "No returns on medicines.",
      accentColor: "#166534",
    });
    expect(pharmacyRes.ok).toBe(true);

    const consultationDesign = await getBillDesignFor("CONSULTATION");
    // Untouched — saving the pharmacy design must not bleed into the other kind.
    expect(consultationDesign.documentTitle).toBe("TAX INVOICE");

    const pharmacyDesign = await getBillDesignFor("PHARMACY");
    expect(pharmacyDesign.documentTitle).toBe("PHARMACY RECEIPT");
    expect(pharmacyDesign.accentColor).toBe("#166534");
  });

  it("denies non-admin roles", async () => {
    currentRole.value = "RECEPTIONIST";
    const res = await saveBillDesignAction({
      kind: "CONSULTATION",
      documentTitle: "TAX INVOICE",
      headerNote: "",
      footerNote: "",
      accentColor: "#0f766e",
    });
    expect(res.ok).toBe(false);
    currentRole.value = "RECEPTIONIST";
  });

  it("rejects an invalid accent colour", async () => {
    currentRole.value = "ADMIN";
    const res = await saveBillDesignAction({
      kind: "PHARMACY",
      documentTitle: "PHARMACY RECEIPT",
      headerNote: "",
      footerNote: "",
      accentColor: "#123456",
    });
    expect(res.ok).toBe(false);
  });
});
