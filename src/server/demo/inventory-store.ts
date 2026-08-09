/**
 * Inventory domain logic: stock movement math + helpers that mutate the
 * medicine list and record who changed what, via `db.medicines` /
 * `db.stockMovements`.
 */
import { db } from "@/server/repositories";
import type { Medicine, StockMovementType } from "@/types/domain";

let seq = 100;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}_${seq}_${Date.now().toString(36)}`;
}

export async function findMedicine(id: string): Promise<Medicine | null> {
  return db.medicines.get(id);
}

/** Apply a signed stock change, stamp the user, and log a movement. */
export async function applyStockChange(
  medicineId: string,
  delta: number,
  type: StockMovementType,
  reason: string,
  by: string,
): Promise<{ ok: boolean; message: string; balanceAfter?: number }> {
  const med = await findMedicine(medicineId);
  if (!med) return { ok: false, message: "Medicine not found." };
  const balanceAfter = med.stockQty + delta;
  if (balanceAfter < 0) {
    return { ok: false, message: `Insufficient stock. Only ${med.stockQty} ${med.unit} available.` };
  }
  const now = new Date().toISOString();
  await db.medicines.update(medicineId, { stockQty: balanceAfter, updatedBy: by, updatedAt: now });
  await db.stockMovements.insert({
    id: nextId("mv"),
    medicineId,
    medicineName: med.name,
    type,
    quantity: delta,
    balanceAfter,
    reason,
    by,
    at: now,
  });
  return { ok: true, message: "Stock updated.", balanceAfter };
}

export async function addMedicine(input: {
  name: string;
  genericName?: string;
  category?: string;
  brand?: string;
  unit: string;
  reorderLevel: number;
  sellPrice: number;
  openingStock: number;
  by: string;
}): Promise<Medicine> {
  const now = new Date().toISOString();
  const med: Medicine = {
    id: nextId("med"),
    name: input.name,
    genericName: input.genericName || null,
    category: input.category || null,
    brand: input.brand || null,
    unit: input.unit,
    reorderLevel: input.reorderLevel,
    stockQty: input.openingStock,
    sellPrice: input.sellPrice,
    nearestExpiry: null,
    isActive: true,
    updatedBy: input.by,
    updatedAt: now,
  };
  await db.medicines.insert(med);
  if (input.openingStock > 0) {
    await db.stockMovements.insert({
      id: nextId("mv"),
      medicineId: med.id,
      medicineName: med.name,
      type: "IN",
      quantity: input.openingStock,
      balanceAfter: input.openingStock,
      reason: "Opening stock",
      by: input.by,
      at: now,
    });
  }
  return med;
}

/**
 * Update medicine attributes (never stockQty — that goes through
 * applyStockChange so every quantity change leaves a movement trail).
 */
export async function updateMedicine(
  id: string,
  patch: Partial<Pick<Medicine, "name" | "genericName" | "category" | "brand" | "unit" | "reorderLevel" | "sellPrice" | "isActive">>,
  by: string,
): Promise<Medicine | null> {
  return db.medicines.update(id, { ...patch, updatedBy: by, updatedAt: new Date().toISOString() });
}

export async function lowStockItems(): Promise<Medicine[]> {
  return db.medicines.list((m) => m.isActive && m.stockQty <= m.reorderLevel);
}
