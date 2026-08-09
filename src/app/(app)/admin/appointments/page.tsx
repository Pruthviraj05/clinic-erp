import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { listAppointments } from "@/server/services/appointments.service";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { AppointmentsView } from "@/features/appointments/appointments-view";

export const metadata: Metadata = { title: "Appointments" };

export default async function AdminAppointmentsPage() {
  const { user } = await requireRole("ADMIN");
  const [appointments, branches, doctors, patients] = await Promise.all([
    listAppointments(user, { range: "all" }),
    db.branches.list(),
    db.doctors.list(),
    db.patients.list(),
  ]);

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="All consultations across every branch."
      />
      <AppointmentsView
        appointments={appointments}
        branches={branches.map((b) => ({ id: b.id, label: b.name }))}
        doctors={doctors.map((d) => ({ id: d.id, label: d.fullName, sublabel: d.specialization ?? undefined }))}
        patients={patients.map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }))}
      />
    </div>
  );
}
