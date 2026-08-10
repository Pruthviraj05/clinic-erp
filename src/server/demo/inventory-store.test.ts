import { describe, it, expect } from "vitest";
import { medicines } from "./data";
import { addMedicine, applyStockChange, findMedicine, lowStockItems } from "./inventory-store";
import { db } from "@/server/repositories";

describe("inventory store", () => {
  it("deducts stock, stamps the user, and logs a movement", async () => {
    const med = medicines[0];
    // Top up first so the deduction below never depends on the seed's
    // opening stock level (derive expectations from the data, not constants).
    await applyStockChange(med.id, 50, "IN", "Stock receipt — TEST", "Admin");
    const before = (await findMedicine(med.id))!.stockQty;
    const movesBefore = (await db.stockMovements.list()).length;

    const res = await applyStockChange(med.id, -5, "SALE", "Dispensed — TEST", "Dr. Test");
    expect(res.ok).toBe(true);
    expect(res.balanceAfter).toBe(before - 5);
    expect((await findMedicine(med.id))!.stockQty).toBe(before - 5);
    expect((await findMedicine(med.id))!.updatedBy).toBe("Dr. Test");

    const moves = await db.stockMovements.list();
    expect(moves.length).toBe(movesBefore + 1);
    const mv = moves[moves.length - 1];
    expect(mv.medicineId).toBe(med.id);
    expect(mv.quantity).toBe(-5);
    expect(mv.balanceAfter).toBe(before - 5);
    expect(mv.by).toBe("Dr. Test");
  });

  it("refuses to go negative (insufficient stock)", async () => {
    const med = medicines[0];
    const current = (await findMedicine(med.id))!.stockQty;
    const res = await applyStockChange(med.id, -(current + 100), "SALE", "overdraw", "X");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/insufficient/i);
  });

  it("adds a medicine with opening stock + opening movement", async () => {
    const countBefore = (await db.medicines.list()).length;
    const med = await addMedicine({
      name: "Test Syrup",
      unit: "bottle",
      reorderLevel: 10,
      sellPrice: 55,
      openingStock: 20,
      by: "Test User",
    });
    expect((await db.medicines.list()).length).toBe(countBefore + 1);
    expect(med.stockQty).toBe(20);
    expect(med.updatedBy).toBe("Test User");

    const moves = await db.stockMovements.list((m) => m.medicineId === med.id);
    expect(moves).toHaveLength(1);
    expect(moves[0].type).toBe("IN");
  });

  it("reports low-stock items", async () => {
    const low = await lowStockItems();
    expect(Array.isArray(low)).toBe(true);
    expect(low.every((m) => m.stockQty <= m.reorderLevel)).toBe(true);
  });
});
