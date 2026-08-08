import { cn } from "@/lib/utils";
import { humanizeEnum } from "@/lib/format";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-[var(--info)]/12 text-[var(--info)]",
  success: "bg-[var(--success)]/14 text-[var(--success)]",
  warning: "bg-[var(--warning)]/16 text-[color-mix(in_oklch,var(--warning),black_18%)] dark:text-[var(--warning)]",
  danger: "bg-destructive/12 text-destructive",
  primary: "bg-primary/12 text-primary",
};

/** Central mapping of every status enum -> a colour tone. */
const STATUS_TONE: Record<string, Tone> = {
  // Appointment
  SCHEDULED: "neutral",
  CONFIRMED: "info",
  CHECKED_IN: "primary",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "danger",
  RESCHEDULED: "info",
  // Payment
  UNPAID: "danger",
  PARTIAL: "warning",
  PAID: "success",
  REFUNDED: "neutral",
  WAIVED: "neutral",
  // Invoice
  DRAFT: "neutral",
  ISSUED: "info",
  PARTIALLY_PAID: "warning",
  // Notification / generic
  SENT: "success",
  DELIVERED: "success",
  PENDING: "warning",
  FAILED: "danger",
  ACTIVE: "success",
  INACTIVE: "neutral",
  // Consent / leave / approvals
  SIGNED: "success",
  DECLINED: "danger",
  APPROVED: "success",
  REJECTED: "danger",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {humanizeEnum(status)}
    </span>
  );
}
