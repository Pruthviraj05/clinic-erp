/**
 * Mutable inventory store for demo mode: stock movements log + helpers that
 * mutate the medicine list and record who changed what. In Prisma mode these
 * become StockMovement rows + Medicine updates inside a transaction.
 */
import { medicines } from "./data";
import type { Medicine, StockMovementItem, StockMovementType } from "@/types/domain";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

export const stockMovements: StockMovementItem[] = [
  { id: "mv_1", medicineId: "med_001", medicineName: "Paracetamol 500mg", type: "IN", quantity: 500, balanceAfter: 640, reason: "Purchase — MediSupply", by: "Neha Sharma", at: hoursAgo(30) },
  { id: "mv_2", medicineId: "med_004", medicineName: "Adapalene 0.1% Gel", type: "SALE", quantity: -3, balanceAfter: 12, reason: "Dispensed — INV-2026-000231", by: "Sana Kapoor", at: hoursAgo(6) },
  { id: "mv_3", medicineId: "med_002", medicineName: "Amoxicillin 500mg", type: "ADJUST", quantity: -5, balanceAfter: 45, reason: "Damaged stock write-off", by: "Neha Sharma", at: hoursAgo(20) },
];

let seq = 100;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}_${seq}`;
}

export function findMedicine(id: string): Medicine | undefined {
  return medicines.find((m) => m.id === id);
}

/** Apply a signed stock change, stamp the user, and log a movement. */
export function applyStockChange(
  medicineId: string,
  delta: number,
  type: StockMovementType,
  reason: string,
  by: string,
): { ok: boolean; message: string; balanceAfter?: number } {
  const med = findMedicine(medicineId);
  if (!med) return { ok: false, message: "Medicine not found." };
  const balanceAfter = med.stockQty + delta;
  if (balanceAfter < 0) {
    return { ok: false, message: `Insufficient stock. Only ${med.stockQty} ${med.unit} available.` };
  }
  med.stockQty = balanceAfter;
  med.updatedBy = by;
  med.updatedAt = new Date().toISOString();
  stockMovements.unshift({
    id: nextId("mv"),
    medicineId,
    medicineName: med.name,
    type,
    quantity: delta,
    balanceAfter,
    reason,
    by,
    at: med.updatedAt,
  });
  return { ok: true, message: "Stock updated.", balanceAfter };
}

export function addMedicine(input: {
  name: string;
  genericName?: string;
  category?: string;
  brand?: string;
  unit: string;
  reorderLevel: number;
  sellPrice: number;
  openingStock: number;
  by: string;
}): Medicine {
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
  medicines.push(med);
  if (input.openingStock > 0) {
    stockMovements.unshift({
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
export function updateMedicine(
  id: string,
  patch: Partial<Pick<Medicine, "name" | "genericName" | "category" | "brand" | "unit" | "reorderLevel" | "sellPrice" | "isActive">>,
  by: string,
): Medicine | null {
  const med = findMedicine(id);
  if (!med) return null;
  Object.assign(med, patch);
  med.updatedBy = by;
  med.updatedAt = new Date().toISOString();
  return med;
}

export function lowStockItems(): Medicine[] {
  return medicines.filter((m) => m.stockQty <= m.reorderLevel);
}
