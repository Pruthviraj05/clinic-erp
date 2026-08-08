import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** e.g. +12.5 (percent). Positive renders green, negative red. */
  trend?: number;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "info" | "destructive";
}

const ACCENT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-[var(--success)]/12 text-[var(--success)]",
  warning: "bg-[var(--warning)]/15 text-[var(--warning)]",
  info: "bg-[var(--info)]/12 text-[var(--info)]",
  destructive: "bg-destructive/10 text-destructive",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
  accent = "primary",
}: StatCardProps) {
  const hasTrend = typeof trend === "number";
  const up = (trend ?? 0) >= 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={cn("flex size-10 items-center justify-center rounded-xl", ACCENT[accent])}>
          <Icon className="size-5" />
        </div>
      </div>
      {(hasTrend || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {hasTrend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                up ? "bg-[var(--success)]/12 text-[var(--success)]" : "bg-destructive/10 text-destructive",
              )}
            >
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(trend!)}%
            </span>
          )}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      )}
    </Card>
  );
}
