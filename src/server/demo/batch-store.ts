/**
 * Batch-level stock.
 *
 * A pharmacy cannot treat stock as one number. Expiry belongs to a lot, a
 * recall targets a lot, and the price we paid varies between purchases — so
 * quantity is held per `MedicineBatch` and the medicine's `stockQty` /
 * `nearestExpiry` are maintained as derived aggregates for the list screens.
 *
 * Dispensing is FEFO (first-expiry-first-out): the lot closest to expiry goes
 * out first, which is what minimises write-offs and is what an inspector
 * expects to see.
 */
import { db } from "@/server/repositories";
import { newId } from "@/lib/ids";
import type { MedicineBatch, StockMovementItem } from "@/types/domain";

/** Batches still holding stock, ordered by the FEFO rule. */
export async function activeBatches(medicineId: string): Promise<MedicineBatch[]> {
  const rows = await db.medicineBatches.find({ medicineId, quantity: { $gt: 0 } });
  return sortFefo(rows);
}

/**
 * Earliest expiry first; lots with no stated expiry go last, because a known
 * expiry date is always the more urgent one to clear.
 */
export function sortFefo(batches: MedicineBatch[]): MedicineBatch[] {
  return [...batches].sort((a, b) => {
    if (a.expiry === b.expiry) return a.receivedAt.localeCompare(b.receivedAt);
    if (!a.expiry) return 1;
    if (!b.expiry) return -1;
    return a.expiry.localeCompare(b.expiry);
  });
}

/** Recompute and persist the medicine's cached totals from its lots. */
export async function syncMedicineTotals(medicineId: string, by: string): Promise<number> {
  const batches = await db.medicineBatches.find({ medicineId });
  const stockQty = batches.reduce((sum, b) => sum + b.quantity, 0);
  const withStock = sortFefo(batches.filter((b) => b.quantity > 0 && b.expiry));
  await db.medicines.update(medicineId, {
    stockQty,
    nearestExpiry: withStock[0]?.expiry ?? null,
    updatedBy: by,
    updatedAt: new Date().toISOString(),
  });
  return stockQty;
}

export interface ReceiveStockInput {
  medicineId: string;
  quantity: number;
  batchNo: string;
  expiry: string | null;
  costPrice: number;
  mrp: number;
  supplierName?: string;
  purchaseBillNo?: string;
  by: string;
  reason?: string;
  billPhotoDataUrl?: string;
}

/**
 * Receive a purchased lot. Creates the batch, logs an IN movement against it,
 * and refreshes the medicine's totals and latest cost price.
 */
export async function receiveStock(
  input: ReceiveStockInput,
): Promise<{ ok: boolean; message: string; batch?: MedicineBatch }> {
  const medicine = await db.medicines.get(input.medicineId);
  if (!medicine) return { ok: false, message: "Medicine not found." };
  if (input.quantity <= 0) return { ok: false, message: "Quantity must be at least 1." };

  const now = new Date().toISOString();
  const batch: MedicineBatch = {
    id: newId("bat"),
    medicineId: medicine.id,
    medicineName: medicine.name,
    batchNo: input.batchNo.trim() || "—",
    expiry: input.expiry,
    quantity: input.quantity,
    receivedQty: input.quantity,
    costPrice: input.costPrice,
    mrp: input.mrp,
    supplierName: input.supplierName?.trim() || null,
    purchaseBillNo: input.purchaseBillNo?.trim() || null,
    receivedAt: now,
    receivedBy: input.by,
  };
  await db.medicineBatches.insert(batch);

  const balanceAfter = await syncMedicineTotals(medicine.id, input.by);
  // The latest purchase price drives margin reporting.
  await db.medicines.update(medicine.id, {
    costPrice: input.costPrice,
    ...(input.mrp > 0 ? { mrp: input.mrp } : {}),
  });

  await db.stockMovements.insert({
    id: newId("mv"),
    medicineId: medicine.id,
    medicineName: medicine.name,
    type: "IN",
    quantity: input.quantity,
    balanceAfter,
    reason:
      input.reason ||
      [input.supplierName, input.purchaseBillNo].filter(Boolean).join(" · ") ||
      "Stock received",
    by: input.by,
    at: now,
    batchId: batch.id,
    batchNo: batch.batchNo,
    expiry: batch.expiry,
    ...(input.billPhotoDataUrl ? { billPhotoDataUrl: input.billPhotoDataUrl } : {}),
  });

  return { ok: true, message: `Received ${input.quantity} × ${medicine.name}.`, batch };
}

export interface DispenseLine {
  batchId: string;
  batchNo: string;
  expiry: string | null;
  quantity: number;
  costPrice: number;
}

/**
 * Plan a FEFO withdrawal WITHOUT writing anything.
 *
 * Separated from the commit so a bill can validate every line before touching
 * stock — a partially dispensed bill is much worse than a rejected one.
 */
export async function planDispense(
  medicineId: string,
  quantity: number,
): Promise<{ ok: true; lines: DispenseLine[] } | { ok: false; message: string; available: number }> {
  const batches = await activeBatches(medicineId);
  const available = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (available < quantity) {
    return { ok: false, message: "Insufficient stock.", available };
  }

  const lines: DispenseLine[] = [];
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    lines.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      expiry: batch.expiry,
      quantity: take,
      costPrice: batch.costPrice,
    });
    remaining -= take;
  }
  return { ok: true, lines };
}

/** Commit a plan produced by `planDispense`, logging one movement per lot. */
export async function commitDispense(
  medicineId: string,
  medicineName: string,
  lines: DispenseLine[],
  reason: string,
  by: string,
  type: StockMovementItem["type"] = "SALE",
): Promise<number> {
  const now = new Date().toISOString();
  for (const line of lines) {
    const batch = await db.medicineBatches.get(line.batchId);
    if (!batch) continue;
    await db.medicineBatches.update(line.batchId, { quantity: batch.quantity - line.quantity });
  }
  const balanceAfter = await syncMedicineTotals(medicineId, by);

  for (const line of lines) {
    await db.stockMovements.insert({
      id: newId("mv"),
      medicineId,
      medicineName,
      type,
      quantity: -line.quantity,
      balanceAfter,
      reason,
      by,
      at: now,
      batchId: line.batchId,
      batchNo: line.batchNo,
      expiry: line.expiry,
    });
  }
  return balanceAfter;
}

/** Put dispensed units back (bill cancelled, or a failed multi-line bill). */
export async function restoreDispense(
  medicineId: string,
  lines: DispenseLine[],
  by: string,
): Promise<void> {
  for (const line of lines) {
    const batch = await db.medicineBatches.get(line.batchId);
    if (!batch) continue;
    await db.medicineBatches.update(line.batchId, { quantity: batch.quantity + line.quantity });
  }
  await syncMedicineTotals(medicineId, by);
}

/**
 * Write a lot off the shelf — expired, damaged or returned to the supplier.
 *
 * Expired stock must leave the count or it inflates both stock value and the
 * reorder maths, and worse, remains dispensable. This zeroes the lot and
 * records why, so the loss is visible rather than silently vanishing.
 */
export async function writeOffBatch(
  batchId: string,
  reason: string,
  by: string,
): Promise<{ ok: boolean; message: string; quantity?: number; valueAtCost?: number }> {
  const batch = await db.medicineBatches.get(batchId);
  if (!batch) return { ok: false, message: "Batch not found." };
  if (batch.quantity <= 0) return { ok: false, message: "That batch is already empty." };

  const quantity = batch.quantity;
  const valueAtCost = Math.round(quantity * batch.costPrice * 100) / 100;

  await db.medicineBatches.update(batchId, { quantity: 0 });
  const balanceAfter = await syncMedicineTotals(batch.medicineId, by);

  await db.stockMovements.insert({
    id: newId("mv"),
    medicineId: batch.medicineId,
    medicineName: batch.medicineName,
    // ADJUST rather than OUT: this stock was destroyed or returned, it was
    // not dispensed, and the two must not be conflated in reporting.
    type: "ADJUST",
    quantity: -quantity,
    balanceAfter,
    reason,
    by,
    at: new Date().toISOString(),
    batchId: batch.id,
    batchNo: batch.batchNo,
    expiry: batch.expiry,
  });

  return { ok: true, message: `Wrote off ${quantity} × ${batch.medicineName}.`, quantity, valueAtCost };
}

export interface ExpiryBucket {
  expired: MedicineBatch[];
  within30: MedicineBatch[];
  within90: MedicineBatch[];
}

/**
 * Batches needing attention, split by urgency. Expired stock must be pulled
 * from the shelf immediately; the other two windows are return-to-supplier
 * territory, which is only possible before expiry.
 */
export async function expiringBatches(): Promise<ExpiryBucket> {
  const rows = await db.medicineBatches.find({ quantity: { $gt: 0 } });
  const now = new Date();
  const at = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
  const today = now.toISOString();
  const in30 = at(30);
  const in90 = at(90);

  const dated = sortFefo(rows.filter((b) => b.expiry));
  return {
    expired: dated.filter((b) => b.expiry! <= today),
    within30: dated.filter((b) => b.expiry! > today && b.expiry! <= in30),
    within90: dated.filter((b) => b.expiry! > in30 && b.expiry! <= in90),
  };
}

/** Stock value at cost and at retail, plus the margin between them. */
export function valuation(batches: MedicineBatch[], sellPriceOf: (medicineId: string) => number) {
  const atCost = batches.reduce((s, b) => s + b.quantity * b.costPrice, 0);
  const atRetail = batches.reduce((s, b) => s + b.quantity * sellPriceOf(b.medicineId), 0);
  return {
    atCost: Math.round(atCost * 100) / 100,
    atRetail: Math.round(atRetail * 100) / 100,
    marginPct: atRetail > 0 ? Math.round(((atRetail - atCost) / atRetail) * 1000) / 10 : 0,
  };
}
