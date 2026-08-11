/**
 * Reorder planning — what to buy, how much, and how urgently.
 *
 * A low-stock badge only answers "should I order?". The question the person
 * placing the order actually has is "how many, and which of these matters
 * most this week". That needs a target level to restock up to, and a measure
 * of how fast the item is actually moving.
 *
 * Everything here is derived from stock and the movement ledger — there is no
 * separate list to keep in sync, so it can never go stale.
 */
import { db } from "@/server/repositories";
import type { Medicine, MedicineBatch, StockMovementItem } from "@/types/domain";

/** Days of sales history used to estimate how fast an item moves. */
const CONSUMPTION_WINDOW_DAYS = 90;

/** When no max level is set, restock to this multiple of the reorder level. */
const DEFAULT_MAX_MULTIPLIER = 3;

export type ReorderUrgency = "OUT_OF_STOCK" | "CRITICAL" | "LOW" | "EXPIRING";

export interface ReorderSuggestion {
  medicineId: string;
  name: string;
  unit: string;
  category: string | null;
  stockQty: number;
  reorderLevel: number;
  maxLevel: number;
  /** How many to buy to reach the target level. */
  suggestedQty: number;
  urgency: ReorderUrgency;
  /** Units dispensed per day over the window — 0 when it never moves. */
  dailyUsage: number;
  /** Days of cover left at the current rate; null when usage is 0. */
  daysOfCover: number | null;
  /** Last supplier we bought this from, so the order can be grouped. */
  lastSupplier: string | null;
  lastCostPrice: number | null;
  /** Estimated cost of the suggested quantity. */
  estimatedCost: number;
  /** Set when the reason is soon-to-expire stock rather than a low count. */
  expiringQty?: number;
}

function maxLevelFor(m: Medicine): number {
  if (m.maxLevel && m.maxLevel > m.reorderLevel) return m.maxLevel;
  return Math.max(m.reorderLevel * DEFAULT_MAX_MULTIPLIER, m.reorderLevel + 1);
}

/**
 * Rank by how soon we run out, not by raw shortfall — a fast-moving item one
 * unit below its minimum is more urgent than a slow one at zero.
 */
function urgencyOf(stockQty: number, reorderLevel: number, daysOfCover: number | null): ReorderUrgency {
  if (stockQty <= 0) return "OUT_OF_STOCK";
  if (daysOfCover !== null && daysOfCover <= 7) return "CRITICAL";
  if (stockQty <= reorderLevel / 2) return "CRITICAL";
  return "LOW";
}

export const URGENCY_ORDER: Record<ReorderUrgency, number> = {
  OUT_OF_STOCK: 0,
  CRITICAL: 1,
  LOW: 2,
  EXPIRING: 3,
};

/**
 * Items to reorder, most urgent first.
 *
 * Includes anything at or below its minimum, plus anything whose remaining
 * stock is about to expire — that stock is on the shelf but cannot be relied
 * on, so it needs replacing just the same.
 */
export async function reorderSuggestions(): Promise<ReorderSuggestion[]> {
  const [medicines, batches, movements] = await Promise.all([
    db.medicines.list((m) => m.isActive),
    db.medicineBatches.find({ quantity: { $gt: 0 } }),
    db.stockMovements.list(),
  ]);

  const usage = dailyUsageByMedicine(movements);
  const supplierOf = latestSupplierByMedicine(batches);

  // Stock expiring inside the lead time is effectively already gone.
  const in60 = new Date(Date.now() + 60 * 86_400_000).toISOString();
  const expiringQty = new Map<string, number>();
  for (const b of batches) {
    if (!b.expiry || b.expiry > in60) continue;
    expiringQty.set(b.medicineId, (expiringQty.get(b.medicineId) ?? 0) + b.quantity);
  }

  const suggestions: ReorderSuggestion[] = [];
  for (const m of medicines) {
    const expiring = expiringQty.get(m.id) ?? 0;
    // Treat soon-expiring units as unavailable when deciding whether to order.
    const effectiveStock = m.stockQty - expiring;
    const belowMin = m.stockQty <= m.reorderLevel;
    const shortAfterExpiry = effectiveStock <= m.reorderLevel;
    if (!belowMin && !shortAfterExpiry) continue;

    const max = maxLevelFor(m);
    const dailyUsage = usage.get(m.id) ?? 0;
    const daysOfCover = dailyUsage > 0 ? Math.floor(effectiveStock / dailyUsage) : null;
    const supplier = supplierOf.get(m.id);
    const suggestedQty = Math.max(0, max - effectiveStock);

    suggestions.push({
      medicineId: m.id,
      name: m.name,
      unit: m.unit,
      category: m.category,
      stockQty: m.stockQty,
      reorderLevel: m.reorderLevel,
      maxLevel: max,
      suggestedQty,
      // Flag the expiry-driven ones so the buyer knows the count looks fine
      // but the stock is about to become unusable.
      urgency: belowMin ? urgencyOf(m.stockQty, m.reorderLevel, daysOfCover) : "EXPIRING",
      dailyUsage: Math.round(dailyUsage * 100) / 100,
      daysOfCover,
      lastSupplier: supplier?.name ?? null,
      lastCostPrice: supplier?.costPrice ?? m.costPrice ?? null,
      estimatedCost: Math.round(suggestedQty * (supplier?.costPrice ?? m.costPrice ?? 0) * 100) / 100,
      ...(expiring > 0 ? { expiringQty: expiring } : {}),
    });
  }

  return suggestions.sort((a, b) => {
    const byUrgency = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (byUrgency !== 0) return byUrgency;
    // Then by how soon it runs out, unknowns last.
    if (a.daysOfCover === b.daysOfCover) return a.name.localeCompare(b.name);
    if (a.daysOfCover === null) return 1;
    if (b.daysOfCover === null) return -1;
    return a.daysOfCover - b.daysOfCover;
  });
}

/** Units dispensed per day per medicine, over the recent window. */
export function dailyUsageByMedicine(movements: StockMovementItem[]): Map<string, number> {
  const since = new Date(Date.now() - CONSUMPTION_WINDOW_DAYS * 86_400_000).toISOString();
  const dispensed = new Map<string, number>();
  for (const mv of movements) {
    if (mv.type !== "SALE" && mv.type !== "OUT") continue;
    if (mv.at < since) continue;
    dispensed.set(mv.medicineId, (dispensed.get(mv.medicineId) ?? 0) + Math.abs(mv.quantity));
  }
  const usage = new Map<string, number>();
  for (const [medicineId, qty] of dispensed) {
    usage.set(medicineId, qty / CONSUMPTION_WINDOW_DAYS);
  }
  return usage;
}

/** The supplier and price of the most recent receipt, per medicine. */
function latestSupplierByMedicine(
  batches: MedicineBatch[],
): Map<string, { name: string | null; costPrice: number }> {
  const latest = new Map<string, MedicineBatch>();
  for (const b of batches) {
    const current = latest.get(b.medicineId);
    if (!current || b.receivedAt > current.receivedAt) latest.set(b.medicineId, b);
  }
  const out = new Map<string, { name: string | null; costPrice: number }>();
  for (const [medicineId, b] of latest) {
    out.set(medicineId, { name: b.supplierName ?? null, costPrice: b.costPrice });
  }
  return out;
}

export interface DataQualityIssue {
  key: string;
  label: string;
  count: number;
  medicineIds: string[];
  /** Why it matters, so the nudge is actionable rather than nagging. */
  why: string;
}

/**
 * Gaps in the medicine master that quietly break other features.
 *
 * Surfacing these as counts is far more effective than hoping someone opens
 * each item and notices — a missing HSN code only hurts at GST filing, by
 * which point fixing 40 of them is a bad afternoon.
 */
export async function dataQualityIssues(): Promise<DataQualityIssue[]> {
  const medicines = await db.medicines.list((m) => m.isActive);

  const checks: { key: string; label: string; why: string; fails: (m: Medicine) => boolean }[] = [
    {
      key: "category",
      label: "Missing category",
      why: "Category drives reporting and the medicine filters.",
      fails: (m) => !m.category?.trim(),
    },
    {
      key: "hsn",
      label: "Missing HSN code",
      why: "Required on a GST invoice — missing codes surface at filing time.",
      fails: (m) => !m.hsnCode?.trim(),
    },
    {
      key: "rack",
      label: "Missing rack location",
      why: "Staff have to hunt the shelves for these.",
      fails: (m) => !m.rackLocation?.trim(),
    },
    {
      key: "maxLevel",
      label: "No maximum level set",
      why: "Without it the reorder list can only guess how much to buy.",
      fails: (m) => !m.maxLevel || m.maxLevel <= m.reorderLevel,
    },
    {
      key: "cost",
      label: "No purchase price",
      why: "Stock value and margin are wrong without it.",
      fails: (m) => m.costPrice === undefined || m.costPrice === null || m.costPrice <= 0,
    },
    {
      key: "schedule",
      label: "No schedule classification",
      why: "H and H1 drugs may only be dispensed against a prescription.",
      fails: (m) => !m.schedule,
    },
  ];

  return checks
    .map(({ key, label, why, fails }) => {
      const failing = medicines.filter(fails);
      return { key, label, why, count: failing.length, medicineIds: failing.map((m) => m.id) };
    })
    .filter((issue) => issue.count > 0)
    .sort((a, b) => b.count - a.count);
}
