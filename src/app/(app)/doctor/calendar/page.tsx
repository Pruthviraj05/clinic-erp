import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { listAppointments } from "@/server/services/appointments.service";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarBoard } from "@/features/calendar/calendar-board";

export const metadata: Metadata = { title: "Calendar" };

export default async function DoctorCalendarPage() {
  const { user } = await requireRole("DOCTOR");
  const appointments = await listAppointments(user, { range: "all" });
  return (
    <div>
      <PageHeader title="Calendar" description="Your consultation schedule." />
      <CalendarBoard appointments={appointments} todayIso={new Date().toISOString()} />
    </div>
  );
}
