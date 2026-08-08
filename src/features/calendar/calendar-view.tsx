import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Week agenda. Server component — computes the current week and buckets
 * appointments by day. (No hydration concern since it renders on the server.)
 */
export function CalendarView({ appointments }: { appointments: Appointment[] }) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const todayKey = ymd(now);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = ymd(d);
    const items = appointments
      .filter((a) => ymd(new Date(a.scheduledStart)) === key)
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    return { label: DAY_LABELS[i], date: d, key, items, isToday: key === todayKey };
  });

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="grid min-w-[840px] grid-cols-7 gap-3">
        {days.map((day) => (
          <div key={day.key} className="flex flex-col">
            <div
              className={cn(
                "mb-2 rounded-lg border px-3 py-2 text-center",
                day.isToday && "border-primary/40 bg-primary/5",
              )}
            >
              <p className="text-xs text-muted-foreground">{day.label}</p>
              <p className={cn("text-lg font-semibold", day.isToday && "text-primary")}>{day.date.getDate()}</p>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {day.items.length ? (
                day.items.map((a) => (
                  <div key={a.id} className="rounded-lg border bg-card p-2.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("size-1.5 rounded-full", STATUS_DOT[a.status] ?? "bg-muted-foreground")} />
                      <span className="font-medium">{formatTime(a.scheduledStart)}</span>
                    </div>
                    <p className="mt-1 truncate font-medium">{a.patientName}</p>
                    <p className="truncate text-muted-foreground">{a.doctorName}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed py-6 text-center text-[11px] text-muted-foreground/60">
                  —
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
