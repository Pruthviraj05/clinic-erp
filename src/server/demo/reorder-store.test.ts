import { describe, it, expect, vi } from "vitest";
import type { Medicine } from "@/types/domain";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { reorderSuggestions, dataQualityIssues, dailyUsageByMedicine } = await import("./reorder-store");
const { receiveStock, planDispense, commitDispense, writeOffBatch } = await import("./batch-store");
const { db } = await import("@/server/repositories");

function iso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** Unique prefix per test so the shared in-memory store stays isolated. */
let n = 0;
async function makeMedicine(over: Partial<Medicine> = {}): Promise<Medicine> {
  const id = `med_ro_${n++}`;
  const med: Medicine = {
    id,
    name: `Reorder Med ${id}`,
    genericName: null,
    category: "NSAID",
    brand: null,
    unit: "Tablet",
    reorderLevel: 20,
    stockQty: 0,
    sellPrice: 10,
    nearestExpiry: null,
    isActive: true,
    hsnCode: "3004",
    rackLocation: "A-1",
    maxLevel: 100,
    costPrice: 6,
    schedule: "OTC",
    ...over,
  };
  await db.medicines.insert(med);
  return med;
}

async function find(medicineId: string) {
  return (await reorderSuggestions()).find((s) => s.medicineId === medicineId);
}

describe("reorderSuggestions", () => {
  it("ignores an item comfortably above its minimum", async () => {
    const m = await makeMedicine();
    await receiveStock({ medicineId: m.id, quantity: 80, batchNo: "OK", expiry: iso(400), costPrice: 6, mrp: 12, by: "T" });
    expect(await find(m.id)).toBeUndefined();
  });

  it("suggests topping up to the maximum, not just to the minimum", async () => {
    const m = await makeMedicine({ reorderLevel: 20, maxLevel: 100 });
    await receiveStock({ medicineId: m.id, quantity: 15, batchNo: "LOW", expiry: iso(400), costPrice: 6, mrp: 12, by: "T" });

    const s = (await find(m.id))!;
    expect(s.suggestedQty).toBe(85); // 100 target − 15 on hand
    expect(s.estimatedCost).toBe(510); // 85 × ₹6
  });

  it("falls back to a multiple of the minimum when no maximum is set", async () => {
    const m = await makeMedicine({ reorderLevel: 10, maxLevel: null });
    await receiveStock({ medicineId: m.id, quantity: 5, batchNo: "X", expiry: iso(400), costPrice: 6, mrp: 12, by: "T" });
    const s = (await find(m.id))!;
    expect(s.maxLevel).toBe(30); // 3 × reorder level
    expect(s.suggestedQty).toBe(25);
  });

  it("ranks an out-of-stock item above a merely low one", async () => {
    const empty = await makeMedicine({ name: "Zzz Empty" });
    const low = await makeMedicine({ name: "Aaa Low" });
    await receiveStock({ medicineId: low.id, quantity: 15, batchNo: "L", expiry: iso(400), costPrice: 6, mrp: 12, by: "T" });

    const all = await reorderSuggestions();
    const iEmpty = all.findIndex((s) => s.medicineId === empty.id);
    const iLow = all.findIndex((s) => s.medicineId === low.id);
    expect(iEmpty).toBeGreaterThanOrEqual(0);
    // Alphabetically "Zzz" sorts last — urgency must win over name.
    expect(iEmpty).toBeLessThan(iLow);
    expect(all[iEmpty].urgency).toBe("OUT_OF_STOCK");
  });

  it("flags an item whose remaining stock is about to expire, even when the count looks fine", async () => {
    const m = await makeMedicine({ reorderLevel: 20, maxLevel: 100 });
    // 60 units on hand — well above the minimum — but all expiring in 10 days.
    await receiveStock({ medicineId: m.id, quantity: 60, batchNo: "SOON", expiry: iso(10), costPrice: 6, mrp: 12, by: "T" });

    const s = (await find(m.id))!;
    expect(s.urgency).toBe("EXPIRING");
    expect(s.expiringQty).toBe(60);
    expect(s.stockQty).toBe(60);
    // Soon-expiring units do not count towards cover, so it needs a full top-up.
    expect(s.suggestedQty).toBe(100);
  });

  it("estimates days of cover from actual dispensing", async () => {
    const m = await makeMedicine({ reorderLevel: 50, maxLevel: 200 });
    await receiveStock({ medicineId: m.id, quantity: 100, batchNo: "U", expiry: iso(400), costPrice: 6, mrp: 12, by: "T" });
    // Dispense 90 units, i.e. 1/day across the 90-day window.
    const plan = await planDispense(m.id, 90);
    if (!plan.ok) throw new Error("expected a plan");
    await commitDispense(m.id, m.name, plan.lines, "test", "T");

    const s = (await find(m.id))!;
    expect(s.dailyUsage).toBeCloseTo(1, 1);
    expect(s.daysOfCover).toBe(10); // 10 left at ~1/day
    expect(s.urgency).toBe("CRITICAL"); // under a week... 10d, so via the half-min rule
  });

  it("leaves days of cover unknown for an item that never moves", async () => {
    const m = await makeMedicine({ reorderLevel: 20 });
    await receiveStock({ medicineId: m.id, quantity: 5, batchNo: "DEAD", expiry: iso(400), costPrice: 6, mrp: 12, by: "T" });
    const s = (await find(m.id))!;
    expect(s.dailyUsage).toBe(0);
    expect(s.daysOfCover).toBeNull();
  });

  it("carries the last supplier through so the order can be grouped", async () => {
    const m = await makeMedicine();
    await receiveStock({ medicineId: m.id, quantity: 5, batchNo: "S1", expiry: iso(400), costPrice: 7, mrp: 12, supplierName: "Sahyadri Pharma", by: "T" });
    const s = (await find(m.id))!;
    expect(s.lastSupplier).toBe("Sahyadri Pharma");
    expect(s.lastCostPrice).toBe(7);
  });

  it("skips inactive medicines", async () => {
    const m = await makeMedicine({ isActive: false });
    expect(await find(m.id)).toBeUndefined();
  });
});

describe("dailyUsageByMedicine", () => {
  it("counts dispensing but not receipts, and ignores anything older than the window", () => {
    const usage = dailyUsageByMedicine([
      { medicineId: "m1", type: "SALE", quantity: -90, at: iso(-1) },
      { medicineId: "m1", type: "IN", quantity: 500, at: iso(-1) },
      { medicineId: "m1", type: "SALE", quantity: -900, at: iso(-200) }, // outside window
    ] as never[]);
    expect(usage.get("m1")).toBeCloseTo(1, 5); // 90 units / 90 days
  });
});

describe("writeOffBatch", () => {
  it("zeroes the lot, reduces stock and records the loss as an adjustment", async () => {
    const m = await makeMedicine();
    await receiveStock({ medicineId: m.id, quantity: 40, batchNo: "BAD", expiry: iso(-2), costPrice: 6, mrp: 12, by: "T" });
    const [batch] = await db.medicineBatches.find({ medicineId: m.id });

    const res = await writeOffBatch(batch.id, "Expired — destroyed", "T");
    expect(res.ok).toBe(true);
    expect(res.quantity).toBe(40);
    expect(res.valueAtCost).toBe(240);

    expect((await db.medicineBatches.get(batch.id))!.quantity).toBe(0);
    expect((await db.medicines.get(m.id))!.stockQty).toBe(0);

    const moves = await db.stockMovements.find({ medicineId: m.id, type: "ADJUST" });
    expect(moves).toHaveLength(1);
    expect(moves[0].quantity).toBe(-40);
    expect(moves[0].batchNo).toBe("BAD");
  });

  it("refuses an already-empty lot", async () => {
    const m = await makeMedicine();
    await receiveStock({ medicineId: m.id, quantity: 5, batchNo: "E", expiry: iso(90), costPrice: 6, mrp: 12, by: "T" });
    const [batch] = await db.medicineBatches.find({ medicineId: m.id });
    await writeOffBatch(batch.id, "first", "T");
    expect((await writeOffBatch(batch.id, "again", "T")).ok).toBe(false);
  });

  it("written-off stock can no longer be dispensed", async () => {
    const m = await makeMedicine();
    await receiveStock({ medicineId: m.id, quantity: 30, batchNo: "W", expiry: iso(-1), costPrice: 6, mrp: 12, by: "T" });
    const [batch] = await db.medicineBatches.find({ medicineId: m.id });
    await writeOffBatch(batch.id, "Expired", "T");
    expect((await planDispense(m.id, 1)).ok).toBe(false);
  });
});

describe("dataQualityIssues", () => {
  it("counts only the fields that are actually missing", async () => {
    await makeMedicine({ hsnCode: null, rackLocation: null });
    const issues = await dataQualityIssues();
    const byKey = Object.fromEntries(issues.map((i) => [i.key, i]));
    expect(byKey.hsn?.count).toBeGreaterThan(0);
    expect(byKey.rack?.count).toBeGreaterThan(0);
    // Each issue explains why it matters, so the nudge is actionable.
    expect(byKey.hsn?.why).toMatch(/GST/i);
  });

  it("treats a maximum at or below the minimum as unset", async () => {
    const m = await makeMedicine({ reorderLevel: 20, maxLevel: 20 });
    const issues = await dataQualityIssues();
    expect(issues.find((i) => i.key === "maxLevel")?.medicineIds).toContain(m.id);
  });
});
