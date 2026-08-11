"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ShoppingCart, Download, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReorderSuggestion, ReorderUrgency } from "@/server/demo/reorder-store";

const URGENCY_STYLE: Record<ReorderUrgency, { label: string; className: string }> = {
  OUT_OF_STOCK: { label: "Out of stock", className: "bg-destructive/10 text-destructive" },
  CRITICAL: { label: "Critical", className: "bg-destructive/10 text-destructive" },
  LOW: { label: "Low", className: "bg-[var(--warning)]/15 text-[var(--warning)]" },
  EXPIRING: { label: "Stock expiring", className: "bg-[var(--info)]/12 text-[var(--info)]" },
};

/**
 * The buying list: what to order, how much, and how urgently.
 *
 * Grouped by supplier because that is how orders are actually placed — one
 * call or one email per distributor, not one per medicine.
 */
export function ReorderView({ suggestions }: { suggestions: ReorderSuggestion[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(suggestions.map((s) => s.medicineId)));

  const grouped = useMemo(() => {
    const map = new Map<string, ReorderSuggestion[]>();
    for (const s of suggestions) {
      const key = s.lastSupplier ?? "No supplier recorded";
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [suggestions]);

  const chosen = suggestions.filter((s) => selected.has(s.medicineId));
  const totalCost = chosen.reduce((sum, s) => sum + s.estimatedCost, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function exportList() {
    const { exportToExcel } = await import("@/lib/export");
    await exportToExcel(
      chosen.map((s) => ({
        Medicine: s.name,
        Supplier: s.lastSupplier ?? "",
        InStock: s.stockQty,
        Min: s.reorderLevel,
        Max: s.maxLevel,
        OrderQty: s.suggestedQty,
        Unit: s.unit,
        LastCost: s.lastCostPrice ?? "",
        EstimatedCost: s.estimatedCost,
        Urgency: URGENCY_STYLE[s.urgency].label,
        DaysOfCover: s.daysOfCover ?? "",
      })),
      "purchase-order",
      "Reorder",
    );
  }

  if (!suggestions.length) {
    return (
      <div className="rounded-xl border">
        <EmptyState
          icon={ShoppingCart}
          title="Nothing to reorder"
          description="Every active medicine is above its minimum level with usable stock."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
        <div className="text-sm">
          <span className="font-medium">{chosen.length}</span> of {suggestions.length} item(s) selected ·{" "}
          estimated cost <span className="font-semibold">{formatCurrency(totalCost)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={exportList} disabled={!chosen.length}>
          <Download className="size-4" /> Export purchase list
        </Button>
      </div>

      {grouped.map(([supplier, items]) => (
        <div key={supplier} className="overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
            <p className="text-sm font-medium">{supplier}</p>
            <p className="text-xs text-muted-foreground">{items.length} item(s)</p>
          </div>
          <div className="divide-y">
            {items.map((s) => {
              const style = URGENCY_STYLE[s.urgency];
              return (
                <label
                  key={s.medicineId}
                  className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.medicineId)}
                    onChange={() => toggle(s.medicineId)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", style.className)}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.stockQty} {s.unit} in stock · min {s.reorderLevel} · max {s.maxLevel}
                      {s.daysOfCover !== null && <> · about {s.daysOfCover} day(s) of cover left</>}
                      {s.dailyUsage > 0 && <> · {s.dailyUsage}/day</>}
                      {s.expiringQty ? (
                        <span className="text-[var(--info)]"> · {s.expiringQty} expiring within 60 days</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {s.suggestedQty} {s.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.estimatedCost > 0 ? formatCurrency(s.estimatedCost) : "price unknown"}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Gaps in the medicine master, shown as counts.
 *
 * These only bite later — a missing HSN code surfaces at GST filing, a missing
 * max level quietly weakens the reorder list — so they need surfacing while
 * they are still cheap to fix.
 */
export function DataQualityPanel({
  issues,
}: {
  issues: { key: string; label: string; count: number; why: string }[];
}) {
  if (!issues.length) return null;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="size-4 text-[var(--warning)]" />
        <p className="text-sm font-medium">Medicine details worth completing</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {issues.map((i) => (
          <div key={i.key} className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm">{i.label}</span>
              <span className="text-lg font-semibold tabular-nums">{i.count}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{i.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Confirm-and-explain dialog trigger for writing a lot off the shelf. */
export function WriteOffButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={disabled} className="text-destructive">
      <PackageX className="size-3.5" /> Write off
    </Button>
  );
}
