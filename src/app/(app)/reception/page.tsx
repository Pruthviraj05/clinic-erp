import Link from "next/link";
import { CalendarDays, Clock, IndianRupee, UserPlus, Receipt, CalendarPlus, Users } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getDashboardData } from "@/server/services/dashboard.service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppointmentsPanel, NotificationsPanel, ActivityPanel } from "@/features/dashboard/widgets";
import { formatCurrency } from "@/lib/format";

const QUICK_ACTIONS = [
  { label: "Register patient", href: "/reception/patients?new=1", icon: UserPlus },
  { label: "Book appointment", href: "/reception/appointments?new=1", icon: CalendarPlus },
  { label: "Create invoice", href: "/reception/billing?new=1", icon: Receipt },
  { label: "View patients", href: "/reception/patients", icon: Users },
];

export default async function ReceptionDashboardPage() {
  const { user } = await requireRole("RECEPTIONIST");
  const d = await getDashboardData(user);

  const waiting = d.todayAppointments.filter((a) => ["CHECKED_IN", "CONFIRMED"].includes(a.status)).length;
  const walkIns = d.todayAppointments.filter((a) => a.type === "WALK_IN").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Front desk"
        description="Manage today's queue, registrations and billing."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's appointments" value={d.todayAppointments.length} icon={CalendarDays} accent="primary" />
        <StatCard label="Waiting patients" value={waiting} icon={Clock} accent="warning" />
        <StatCard label="Today's collection" value={formatCurrency(d.metrics.todayCollection)} icon={IndianRupee} accent="success" />
        <StatCard label="Walk-ins" value={walkIns} icon={UserPlus} accent="info" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((qa) => (
          <Link
            key={qa.href}
            href={qa.href}
            className={cn(buttonVariants({ variant: "outline" }), "h-auto justify-start gap-3 py-4")}
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <qa.icon className="size-4.5" />
            </span>
            <span className="font-medium">{qa.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppointmentsPanel title="Today's queue" appointments={d.todayAppointments} href="/reception/appointments" />
        </div>
        <div className="space-y-4">
          <NotificationsPanel items={d.notifications.slice(0, 4)} />
          <ActivityPanel items={d.activities.slice(0, 4)} />
        </div>
      </div>
    </div>
  );
}
