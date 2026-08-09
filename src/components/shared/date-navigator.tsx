"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayYmd(): string {
  return ymd(new Date());
}

/**
 * Day-based filter control: previous / next day, a date picker, plus Today and
 * All. `value` is a yyyy-mm-dd string, or null for "all dates".
 */
export function DateNavigator({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}) {
  function shift(delta: number) {
    // Parse yyyy-mm-dd as a LOCAL date — `new Date("yyyy-mm-dd")` is UTC
    // midnight, which lands on the previous local day west of Greenwich.
    let base = new Date();
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      const parsed = new Date(y, (m ?? 1) - 1, d ?? 1);
      if (!Number.isNaN(parsed.getTime())) base = parsed;
    }
    base.setDate(base.getDate() + delta);
    onChange(ymd(base));
  }

  const isToday = value === todayYmd();

  return (
    <div className={cn("flex shrink-0 flex-nowrap items-center gap-2", className)}>
      <div className="flex h-9 items-center rounded-lg border">
        <Button
          variant="ghost"
          size="icon-lg"
          className="h-9 rounded-r-none"
          aria-label="Previous day"
          disabled={!value}
          onClick={() => shift(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <label className="relative flex items-center border-x">
          <CalendarDays className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
          <input
            type="date"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="h-9 w-[150px] bg-transparent pl-8 pr-2 text-sm outline-none"
          />
        </label>
        <Button
          variant="ghost"
          size="icon-lg"
          className="h-9 rounded-l-none"
          aria-label="Next day"
          disabled={!value}
          onClick={() => shift(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <Button
        variant={isToday ? "secondary" : "outline"}
        size="lg"
        className="h-9"
        onClick={() => onChange(todayYmd())}
      >
        Today
      </Button>
      <Button
        variant={value === null ? "secondary" : "outline"}
        size="lg"
        className="h-9"
        onClick={() => onChange(null)}
      >
        All
      </Button>
    </div>
  );
}

/** True if an ISO datetime falls on the given yyyy-mm-dd (local). */
export function isOnDay(iso: string, day: string | null): boolean {
  if (!day) return true;
  return ymd(new Date(iso)) === day;
}
