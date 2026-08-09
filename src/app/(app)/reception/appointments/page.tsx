import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { listAppointments } from "@/server/services/appointments.service";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { AppointmentsView } from "@/features/appointments/appointments-view";

export const metadata: Metadata = { title: "Appointments" };

export default async function ReceptionAppointmentsPage() {
  const { user } = await requireRole("RECEPTIONIST");
  const [appointments, branches, doctors, patients] = await Promise.all([
    listAppointments(user, { range: "all" }),
    db.branches.list(),
    db.doctors.list(),
    db.patients.list(),
  ]);
  // Doctors available at this receptionist's branch.
  const branchDoctors = doctors.filter((d) => !user.branchId || d.branchIds.includes(user.branchId));

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Manage bookings and the patient queue for your branch."
      />
      <AppointmentsView
        appointments={appointments}
        defaultBranchId={user.branchId}
        branches={branches.filter((b) => b.id === user.branchId).map((b) => ({ id: b.id, label: b.name }))}
        doctors={branchDoctors.map((d) => ({ id: d.id, label: d.fullName, sublabel: d.specialization ?? undefined }))}
        patients={patients.map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }))}
      />
    </div>
  );
}
