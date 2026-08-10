import { sortFefo } from "@/server/demo/batch-store";
import type { Medicine, MedicineBatch } from "@/types/domain";
import type { MedOption } from "@/features/billing/pharmacy-bill-dialog";

/**
 * Build the medicine picker options for a pharmacy bill, annotating each with
 * the batch FEFO will actually draw from.
 *
 * Showing the lot up front matters: the person at the counter has to take a
 * specific box off the shelf, and if the app silently decides a different one
 * the physical stock and the ledger drift apart.
 */
export function toMedicineOptions(medicines: Medicine[], batches: MedicineBatch[]): MedOption[] {
  const byMedicine = new Map<string, MedicineBatch[]>();
  for (const batch of batches) {
    if (batch.quantity <= 0) continue;
    const list = byMedicine.get(batch.medicineId);
    if (list) list.push(batch);
    else byMedicine.set(batch.medicineId, [batch]);
  }

  return medicines.map((m) => {
    const next = sortFefo(byMedicine.get(m.id) ?? [])[0];
    return {
      id: m.id,
      name: m.name,
      stock: m.stockQty,
      unit: m.unit,
      price: m.sellPrice,
      gstRate: m.gstRate,
      nextBatchNo: next?.batchNo ?? null,
      nextExpiry: next?.expiry ?? null,
    };
  });
}
