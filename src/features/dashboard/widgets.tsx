import Link from "next/link";
import { Activity, Bell, CalendarClock, CalendarDays } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, formatTime, initials } from "@/lib/format";
import type { Appointment, NotificationItem, ActivityItem, Prescription } from "@/types/domain";

/** A single appointment line — reused in dashboards and queue views. */
export function AppointmentRow({ a, showDate }: { a: Appointment; showDate?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-muted/60 py-1.5">
        <span className="text-sm font-semibold">{formatTime(a.scheduledStart)}</span>
        {showDate ? (
          <span className="text-[10px] text-muted-foreground">{formatDate(a.scheduledStart, { day: "2-digit", month: "short" })}</span>
        ) : a.tokenNumber ? (
          <span className="text-[10px] text-muted-foreground">#{a.tokenNumber}</span>
        ) : null}
      </div>
      <Avatar className="size-9">
        <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(a.patientName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{a.patientName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {a.reason ?? "Consultation"} · {a.doctorName}
        </p>
      </div>
      <StatusBadge status={a.status} />
    </div>
  );
}

export function AppointmentsPanel({
  title,
  appointments,
  href,
  showDate,
}: {
  title: string;
  appointments: Appointment[];
  href: string;
  showDate?: boolean;
}) {
  return (
    <SectionCard
      title={title}
      action={
        <Link href={href} className="text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      }
      noPadding
    >
      {appointments.length ? (
        <div className="divide-y">
          {appointments.map((a) => (
            <AppointmentRow key={a.id} a={a} showDate={showDate} />
          ))}
        </div>
      ) : (
        <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Appointments will appear here." />
      )}
    </SectionCard>
  );
}

export function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  return (
    <SectionCard title="Notifications" noPadding>
      {items.length ? (
        <div className="divide-y">
          {items.map((n) => (
            <div key={n.id} className="flex gap-3 px-4 py-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Bell className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                  {formatTime(n.createdAt)} · {n.channel}
                </p>
              </div>
              {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bell} title="All caught up" />
      )}
    </SectionCard>
  );
}

export function ActivityPanel({ items }: { items: ActivityItem[] }) {
  return (
    <SectionCard title="Recent activity" noPadding>
      <div className="divide-y">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Activity className="size-4" />
            </div>
            <p className="flex-1 text-sm">
              <span className="font-medium">{it.actor}</span>{" "}
              <span className="text-muted-foreground">{it.action}</span>{" "}
              <span className="font-medium">{it.target}</span>
            </p>
            <span className="text-xs text-muted-foreground">{formatTime(it.at)}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function FollowUpsPanel({ items }: { items: Prescription[] }) {
  return (
    <SectionCard title="Pending follow-ups" noPadding>
      {items.length ? (
        <div className="divide-y">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--info)]/12 text-[var(--info)]">
                <CalendarClock className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.patientName}</p>
                <p className="truncate text-xs text-muted-foreground">{p.diagnoses[0] ?? "Follow-up"}</p>
              </div>
              <span className="text-xs font-medium">{formatDate(p.followUpDate)}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={CalendarClock} title="No follow-ups due" />
      )}
    </SectionCard>
  );
}
