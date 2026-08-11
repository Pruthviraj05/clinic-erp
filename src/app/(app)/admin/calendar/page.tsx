import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listAppointments } from "@/server/services/appointments.service";
import { db } from "@/server/repositories";
import { getCachedBranches, getCachedDoctors } from "@/server/cache/reference-data";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarBoard } from "@/features/calendar/calendar-board";

export const metadata: Metadata = { title: "Calendar" };

export default async function AdminCalendarPage() {
  const { user } = await requireRole("ADMIN");
  const [appointments, branches, doctors, patients] = await Promise.all([
    listAppointments(user, { range: "all" }),
    getCachedBranches(),
    getCachedDoctors(),
    db.patients.list(),
  ]);

  return (
    <div>
      <PageHeader title="Calendar" description="Appointments across all branches. Click a day to book." />
      <CalendarBoard
        appointments={appointments}
        todayIso={new Date().toISOString()}
        canBook={can(user.role, "appointments", "create")}
        branches={branches.map((b) => ({ id: b.id, label: b.name }))}
        doctors={doctors.filter((d) => d.isActive).map((d) => ({ id: d.id, label: d.fullName, sublabel: d.specialization ?? undefined }))}
        patients={patients.map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }))}
      />
    </div>
  );
}
