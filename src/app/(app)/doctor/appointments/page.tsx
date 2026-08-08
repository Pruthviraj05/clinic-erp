import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { listAppointments } from "@/server/services/appointments.service";
import { branches, doctors, patients } from "@/server/demo/data";
import { PageHeader } from "@/components/shared/page-header";
import { AppointmentsView } from "@/features/appointments/appointments-view";

export const metadata: Metadata = { title: "Appointments" };

export default async function DoctorAppointmentsPage() {
  const { user } = await requireRole("DOCTOR");
  const appointments = await listAppointments(user, { range: "all" });
  // The demo doctor is Dr. Ananya Mehta (doc_mehta).
  const self = doctors.find((d) => d.userId === user.id) ?? doctors[0];
  const myBranches = branches.filter((b) => self.branchIds.includes(b.id));

  return (
    <div>
      <PageHeader title="My appointments" description="Your consultations, queue and bookings." />
      {/* Doctors can book their own appointments and manage the queue. */}
      <AppointmentsView
        appointments={appointments}
        branches={myBranches.map((b) => ({ id: b.id, label: b.name }))}
        doctors={[{ id: self.id, label: self.fullName, sublabel: self.specialization ?? undefined }]}
        patients={patients.map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }))}
        defaultBranchId={self.branchIds[0]}
        canBook
      />
    </div>
  );
}
