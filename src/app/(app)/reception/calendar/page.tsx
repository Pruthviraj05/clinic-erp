import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { listAppointments } from "@/server/services/appointments.service";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarBoard } from "@/features/calendar/calendar-board";

export const metadata: Metadata = { title: "Calendar" };

export default async function ReceptionCalendarPage() {
  const { user } = await requireRole("RECEPTIONIST");
  const [appointments, branches, doctors, patients] = await Promise.all([
    listAppointments(user, { range: "all" }),
    db.branches.list(),
    db.doctors.list(),
    db.patients.list(),
  ]);
  const branchDoctors = doctors.filter((d) => !user.branchId || d.branchIds.includes(user.branchId));

  return (
    <div>
      <PageHeader title="Calendar" description="Your branch appointment schedule. Click a day to book." />
      <CalendarBoard
        appointments={appointments}
        todayIso={new Date().toISOString()}
        canBook={can(user.role, "appointments", "create")}
        defaultBranchId={user.branchId}
        branches={branches.filter((b) => b.id === user.branchId).map((b) => ({ id: b.id, label: b.name }))}
        doctors={branchDoctors.map((d) => ({ id: d.id, label: d.fullName, sublabel: d.specialization ?? undefined }))}
        patients={patients.map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }))}
      />
    </div>
  );
}
