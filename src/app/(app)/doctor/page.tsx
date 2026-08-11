import { CalendarDays, CheckCircle2, Clock, CalendarClock, Stethoscope } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getDashboardData } from "@/server/services/dashboard.service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { AppointmentsPanel, FollowUpsPanel, NotificationsPanel } from "@/features/dashboard/widgets";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export default async function DoctorDashboardPage() {
  const { user } = await requireRole("DOCTOR");
  const d = await getDashboardData(user);

  const mine = d.todayAppointments;
  const current = mine.find((a) => a.status === "IN_PROGRESS");
  const completed = mine.filter((a) => a.status === "COMPLETED").length;
  const waiting = mine.filter((a) => ["CHECKED_IN", "CONFIRMED", "SCHEDULED"].includes(a.status)).length;
  const followUpCount = mine.filter((a) => a.type === "FOLLOW_UP").length;
  const newCount = mine.length - followUpCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.fullName}`}
        description="Your consultations and patient queue for today."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's appointments"
          value={mine.length}
          icon={CalendarDays}
          accent="primary"
          breakdown={[
            { label: "New", value: newCount },
            { label: "Follow-up", value: followUpCount },
          ]}
        />
        <StatCard label="Waiting in queue" value={waiting} icon={Clock} accent="warning" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} accent="success" />
        <StatCard label="Follow-ups due" value={d.pendingFollowUps.length} icon={CalendarClock} accent="info" />
      </div>

      {current && (
        <SectionCard title="Current patient">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-12">
                <AvatarFallback className="bg-primary/10 text-primary">{initials(current.patientName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{current.patientName}</p>
                <p className="text-sm text-muted-foreground">{current.patientMrn} · {current.reason}</p>
                <div className="mt-1"><StatusBadge status={current.status} /></div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">View history</Button>
              <Button>
                <Stethoscope className="size-4" /> Start prescription
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppointmentsPanel title="Today's queue" appointments={mine} href="/doctor/appointments" />
        </div>
        <div className="space-y-4">
          <FollowUpsPanel items={d.pendingFollowUps} />
          <NotificationsPanel items={d.notifications.slice(0, 4)} />
        </div>
      </div>
    </div>
  );
}
