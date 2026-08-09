import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { AppointmentsView } from "@/features/appointments/appointments-view";

export const metadata: Metadata = { title: "Appointments" };

export default async function PortalAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { user } = await requireRole("PATIENT");
  const { new: openBook } = await searchParams;
  const [allPatients, allAppointments, branches, doctors] = await Promise.all([
    db.patients.list(),
    db.appointments.list(),
    db.branches.list(),
    db.doctors.list(),
  ]);
  const me = allPatients.find((p) => p.id === user.linkId)!;
  const mine = allAppointments
    .filter((a) => a.patientId === user.linkId)
    .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart));

  return (
    <div>
      <PageHeader title="My appointments" description="Your upcoming and past visits — book a new one anytime." />
      <AppointmentsView
        appointments={mine}
        branches={branches.map((b) => ({ id: b.id, label: b.name }))}
        doctors={doctors.map((d) => ({ id: d.id, label: d.fullName, sublabel: d.specialization ?? undefined }))}
        patients={[]}
        canBook
        canManage={false}
        fixedPatient={{ id: me.id, label: me.fullName, sublabel: me.mrn }}
        autoOpenBook={openBook === "1"}
      />
    </div>
  );
}
