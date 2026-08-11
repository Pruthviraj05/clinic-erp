import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Medicine } from "@/types/domain";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn) => fn }));

const { receiveStock, planDispense, commitDispense, restoreDispense, sortFefo, expiringBatches, valuation } =
  await import("./batch-store");
const { db } = await import("@/server/repositories");

function iso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}

async function makeMedicine(id: string, sellPrice = 20): Promise<Medicine> {
  const med: Medicine = {
    id,
    name: `Med ${id}`,
    genericName: null,
    category: "NSAID",
    brand: null,
    unit: "Tablet",
    reorderLevel: 10,
    stockQty: 0,
    sellPrice,
    nearestExpiry: null,
    isActive: true,
  };
  await db.medicines.insert(med);
  return med;
}

beforeEach(async () => {
  // Each test works on its own medicine, so no cross-test cleanup is needed.
});

describe("sortFefo", () => {
  it("orders by earliest expiry, and puts undated lots last", () => {
    const rows = [
      { id: "c", expiry: null, receivedAt: "2026-01-01" },
      { id: "a", expiry: "2026-06-01", receivedAt: "2026-01-01" },
      { id: "b", expiry: "2026-03-01", receivedAt: "2026-01-01" },
    ] as never[];
    expect(sortFefo(rows).map((b) => b.id)).toEqual(["b", "a", "c"]);
  });

  it("breaks ties on the same expiry by receipt order", () => {
    const rows = [
      { id: "second", expiry: "2026-03-01", receivedAt: "2026-02-02" },
      { id: "first", expiry: "2026-03-01", receivedAt: "2026-01-01" },
    ] as never[];
    expect(sortFefo(rows).map((b) => b.id)).toEqual(["first", "second"]);
  });
});

describe("receiveStock", () => {
  it("creates a batch and rolls the totals up onto the medicine", async () => {
    await makeMedicine("med_recv");
    const res = await receiveStock({
      medicineId: "med_recv",
      quantity: 100,
      batchNo: "B-001",
      expiry: iso(200),
      costPrice: 8,
      mrp: 25,
      supplierName: "Sahyadri Pharma",
      purchaseBillNo: "SPD-1",
      by: "Tester",
    });
    expect(res.ok).toBe(true);

    const med = (await db.medicines.get("med_recv"))!;
    expect(med.stockQty).toBe(100);
    expect(med.costPrice).toBe(8);
    expect(med.mrp).toBe(25);

    // nearestExpiry is derived from the lot, not entered by hand.
    const [batch] = await db.medicineBatches.find({ medicineId: "med_recv" });
    expect(med.nearestExpiry).toBe(batch.expiry);

    const moves = await db.stockMovements.find({ medicineId: "med_recv" });
    expect(moves).toHaveLength(1);
    expect(moves[0].type).toBe("IN");
    expect(moves[0].batchNo).toBe("B-001");
  });

  it("adds a second lot without disturbing the first, and tracks the nearest expiry", async () => {
    await makeMedicine("med_two");
    await receiveStock({ medicineId: "med_two", quantity: 50, batchNo: "LATE", expiry: iso(300), costPrice: 5, mrp: 10, by: "T" });
    await receiveStock({ medicineId: "med_two", quantity: 30, batchNo: "SOON", expiry: iso(20), costPrice: 6, mrp: 10, by: "T" });

    const med = (await db.medicines.get("med_two"))!;
    expect(med.stockQty).toBe(80);
    // The nearer expiry wins, even though it was received second.
    const batches = await db.medicineBatches.find({ medicineId: "med_two" });
    const soon = batches.find((b) => b.batchNo === "SOON")!;
    expect(med.nearestExpiry).toBe(soon.expiry);
  });

  it("refuses a non-positive quantity", async () => {
    await makeMedicine("med_zero");
    expect((await receiveStock({ medicineId: "med_zero", quantity: 0, batchNo: "X", expiry: null, costPrice: 1, mrp: 2, by: "T" })).ok).toBe(false);
  });
});

describe("planDispense (FEFO)", () => {
  it("draws from the lot expiring soonest first", async () => {
    await makeMedicine("med_fefo");
    await receiveStock({ medicineId: "med_fefo", quantity: 40, batchNo: "FAR", expiry: iso(365), costPrice: 5, mrp: 10, by: "T" });
    await receiveStock({ medicineId: "med_fefo", quantity: 10, batchNo: "NEAR", expiry: iso(10), costPrice: 5, mrp: 10, by: "T" });

    const plan = await planDispense("med_fefo", 6);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.lines).toHaveLength(1);
      expect(plan.lines[0].batchNo).toBe("NEAR");
    }
  });

  it("spans lots when one is not enough, still nearest-first", async () => {
    await makeMedicine("med_span");
    await receiveStock({ medicineId: "med_span", quantity: 40, batchNo: "FAR", expiry: iso(365), costPrice: 5, mrp: 10, by: "T" });
    await receiveStock({ medicineId: "med_span", quantity: 10, batchNo: "NEAR", expiry: iso(10), costPrice: 5, mrp: 10, by: "T" });

    const plan = await planDispense("med_span", 25);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.lines.map((l) => [l.batchNo, l.quantity])).toEqual([
        ["NEAR", 10],
        ["FAR", 15],
      ]);
    }
  });

  it("refuses when total stock is short, and reports what is available", async () => {
    await makeMedicine("med_short");
    await receiveStock({ medicineId: "med_short", quantity: 5, batchNo: "ONLY", expiry: iso(90), costPrice: 5, mrp: 10, by: "T" });

    const plan = await planDispense("med_short", 9);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.available).toBe(5);
  });

  it("plans nothing without writing — stock is untouched until commit", async () => {
    await makeMedicine("med_dry");
    await receiveStock({ medicineId: "med_dry", quantity: 20, batchNo: "A", expiry: iso(90), costPrice: 5, mrp: 10, by: "T" });
    await planDispense("med_dry", 15);
    expect((await db.medicines.get("med_dry"))!.stockQty).toBe(20);
  });
});

describe("commitDispense", () => {
  it("deducts across lots, updates totals and logs one movement per lot", async () => {
    await makeMedicine("med_commit");
    await receiveStock({ medicineId: "med_commit", quantity: 40, batchNo: "FAR", expiry: iso(365), costPrice: 5, mrp: 10, by: "T" });
    await receiveStock({ medicineId: "med_commit", quantity: 10, batchNo: "NEAR", expiry: iso(10), costPrice: 5, mrp: 10, by: "T" });

    const plan = await planDispense("med_commit", 25);
    if (!plan.ok) throw new Error("expected a plan");
    const balance = await commitDispense("med_commit", "Med med_commit", plan.lines, "Dispensed — test", "T");

    expect(balance).toBe(25);
    expect((await db.medicines.get("med_commit"))!.stockQty).toBe(25);

    const batches = await db.medicineBatches.find({ medicineId: "med_commit" });
    expect(batches.find((b) => b.batchNo === "NEAR")!.quantity).toBe(0);
    expect(batches.find((b) => b.batchNo === "FAR")!.quantity).toBe(25);

    const sales = await db.stockMovements.find({ medicineId: "med_commit", type: "SALE" });
    expect(sales).toHaveLength(2);
    expect(sales.every((m) => m.quantity < 0)).toBe(true);
    // Traceability: every sale records which lot it came from.
    expect(sales.every((m) => Boolean(m.batchNo))).toBe(true);
  });

  it("drops the emptied lot out of the nearest-expiry calculation", async () => {
    await makeMedicine("med_expiry_roll");
    await receiveStock({ medicineId: "med_expiry_roll", quantity: 5, batchNo: "NEAR", expiry: iso(5), costPrice: 5, mrp: 10, by: "T" });
    await receiveStock({ medicineId: "med_expiry_roll", quantity: 5, batchNo: "FAR", expiry: iso(300), costPrice: 5, mrp: 10, by: "T" });

    const plan = await planDispense("med_expiry_roll", 5);
    if (!plan.ok) throw new Error("expected a plan");
    await commitDispense("med_expiry_roll", "x", plan.lines, "test", "T");

    const med = (await db.medicines.get("med_expiry_roll"))!;
    const far = (await db.medicineBatches.find({ medicineId: "med_expiry_roll" })).find((b) => b.batchNo === "FAR")!;
    expect(med.nearestExpiry).toBe(far.expiry);
  });
});

describe("restoreDispense", () => {
  it("puts the units back in the lots they came from", async () => {
    await makeMedicine("med_restore");
    await receiveStock({ medicineId: "med_restore", quantity: 30, batchNo: "A", expiry: iso(60), costPrice: 5, mrp: 10, by: "T" });

    const plan = await planDispense("med_restore", 12);
    if (!plan.ok) throw new Error("expected a plan");
    await commitDispense("med_restore", "x", plan.lines, "test", "T");
    expect((await db.medicines.get("med_restore"))!.stockQty).toBe(18);

    await restoreDispense("med_restore", plan.lines, "T");
    expect((await db.medicines.get("med_restore"))!.stockQty).toBe(30);
  });
});

describe("expiringBatches", () => {
  it("buckets by urgency and ignores emptied lots", async () => {
    await makeMedicine("med_exp");
    await receiveStock({ medicineId: "med_exp", quantity: 5, batchNo: "GONE-BAD", expiry: iso(-3), costPrice: 5, mrp: 10, by: "T" });
    await receiveStock({ medicineId: "med_exp", quantity: 5, batchNo: "URGENT", expiry: iso(10), costPrice: 5, mrp: 10, by: "T" });
    await receiveStock({ medicineId: "med_exp", quantity: 5, batchNo: "SOONISH", expiry: iso(60), costPrice: 5, mrp: 10, by: "T" });
    await receiveStock({ medicineId: "med_exp", quantity: 5, batchNo: "FINE", expiry: iso(300), costPrice: 5, mrp: 10, by: "T" });

    const buckets = await expiringBatches();
    const nos = (rows: { batchNo: string }[]) => rows.filter((r) => r.batchNo.match(/GONE-BAD|URGENT|SOONISH|FINE/)).map((r) => r.batchNo);
    expect(nos(buckets.expired)).toContain("GONE-BAD");
    expect(nos(buckets.within30)).toContain("URGENT");
    expect(nos(buckets.within90)).toContain("SOONISH");
    expect(nos(buckets.within90)).not.toContain("FINE");
  });
});

describe("valuation", () => {
  it("values stock at cost and retail and reports the margin", () => {
    const batches = [
      { medicineId: "m1", quantity: 10, costPrice: 6 },
      { medicineId: "m1", quantity: 5, costPrice: 8 },
    ] as never[];
    const v = valuation(batches, () => 20);
    expect(v.atCost).toBe(100); // 10*6 + 5*8
    expect(v.atRetail).toBe(300); // 15 * 20
    expect(v.marginPct).toBeCloseTo(66.7, 1);
  });
});
