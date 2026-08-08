"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import type { Appointment } from "@/types/domain";

const STATUS_DOT: Record<string, string> = {
  COMPLETED: "bg-[var(--success)]",
  IN_PROGRESS: "bg-[var(--warning)]",
  CHECKED_IN: "bg-primary",
  CONFIRMED: "bg-[var(--info)]",
  SCHEDULED: "bg-muted-foreground",
  CANCELLED: "bg-destructive",
  NO_SHOW: "bg-destructive",
};
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

export function CalendarBoard({
  appointments,
  todayIso,
}: {
  appointments: Appointment[];
  todayIso: string;
}) {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<string>(todayIso);
  const todayKey = ymd(new Date(todayIso));

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const k = ymd(new Date(a.scheduledStart));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    for (const list of map.values()) list.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    return map;
  }, [appointments]);

  const cur = new Date(cursor);

  function move(delta: number) {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    else d.setDate(d.getDate() + delta * 7);
    setCursor(d.toISOString());
  }

  // Build the visible day cells.
  const cells: { date: Date; key: string; inMonth: boolean }[] = [];
  if (view === "month") {
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const start = startOfWeek(first);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ date: d, key: ymd(d), inMonth: d.getMonth() === cur.getMonth() });
    }
  } else {
    const start = startOfWeek(cur);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ date: d, key: ymd(d), inMonth: true });
    }
  }

  const title =
    view === "month"
      ? `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`
      : (() => {
          const s = startOfWeek(cur);
          const e = new Date(s);
          e.setDate(s.getDate() + 6);
          return `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
        })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border">
            <Button variant="ghost" size="icon-sm" className="rounded-r-none" aria-label="Previous" onClick={() => move(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="rounded-l-none border-l" aria-label="Next" onClick={() => move(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCursor(todayIso)}>Today</Button>
          <span className="ml-1 text-base font-semibold">{title}</span>
        </div>
        <div className="flex items-center rounded-lg border p-0.5">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors",
                view === v ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className={cn("min-w-[840px]", view === "week" && "min-w-[840px]")}>
          <div className="grid grid-cols-7 border-b">
            {DOW.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className={cn("grid grid-cols-7", view === "month" ? "grid-rows-6" : "")}>
            {cells.map((cell) => {
              const items = byDay.get(cell.key) ?? [];
              const isToday = cell.key === todayKey;
              return (
                <div
                  key={cell.key}
                  className={cn(
                    "border-b border-r p-1.5 first:border-l",
                    view === "month" ? "min-h-[104px]" : "min-h-[420px] align-top",
                    !cell.inMonth && "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <div className="mb-1 flex justify-end">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday && "bg-primary text-primary-foreground",
                      )}
                    >
                      {cell.date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, view === "month" ? 3 : 20).map((a) => (
                      <div key={a.id} className="flex items-center gap-1 rounded bg-card px-1.5 py-1 text-[11px] shadow-sm ring-1 ring-border">
                        <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[a.status] ?? "bg-muted-foreground")} />
                        <span className="font-medium">{formatTime(a.scheduledStart)}</span>
                        <span className="truncate text-muted-foreground">{a.patientName}</span>
                      </div>
                    ))}
                    {view === "month" && items.length > 3 && (
                      <p className="px-1 text-[11px] text-muted-foreground">+{items.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
