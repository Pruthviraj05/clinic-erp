import { describe, it, expect } from "vitest";
import { medicines } from "./data";
import { addMedicine, applyStockChange, findMedicine, lowStockItems, stockMovements } from "./inventory-store";

describe("inventory store", () => {
  it("deducts stock, stamps the user, and logs a movement", () => {
    const med = medicines[0];
    const before = med.stockQty;
    const movesBefore = stockMovements.length;

    const res = applyStockChange(med.id, -5, "SALE", "Dispensed — TEST", "Dr. Test");
    expect(res.ok).toBe(true);
    expect(res.balanceAfter).toBe(before - 5);
    expect(findMedicine(med.id)!.stockQty).toBe(before - 5);
    expect(findMedicine(med.id)!.updatedBy).toBe("Dr. Test");

    expect(stockMovements.length).toBe(movesBefore + 1);
    const mv = stockMovements[0];
    expect(mv.medicineId).toBe(med.id);
    expect(mv.quantity).toBe(-5);
    expect(mv.balanceAfter).toBe(before - 5);
    expect(mv.by).toBe("Dr. Test");
  });

  it("refuses to go negative (insufficient stock)", () => {
    const med = medicines[0];
    const res = applyStockChange(med.id, -(med.stockQty + 100), "SALE", "overdraw", "X");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/insufficient/i);
  });

  it("adds a medicine with opening stock + opening movement", () => {
    const count = medicines.length;
    const med = addMedicine({
      name: "Test Syrup",
      unit: "bottle",
      reorderLevel: 10,
      sellPrice: 55,
      openingStock: 20,
      by: "Neha Sharma",
    });
    expect(medicines.length).toBe(count + 1);
    expect(med.stockQty).toBe(20);
    expect(med.updatedBy).toBe("Neha Sharma");
    expect(stockMovements[0].medicineId).toBe(med.id);
    expect(stockMovements[0].type).toBe("IN");
  });

  it("reports low-stock items", () => {
    const low = lowStockItems();
    expect(Array.isArray(low)).toBe(true);
    expect(low.every((m) => m.stockQty <= m.reorderLevel)).toBe(true);
  });
});
