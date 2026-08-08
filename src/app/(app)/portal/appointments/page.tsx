import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { appointments, branches, doctors, patients, PORTAL_PATIENT_ID } from "@/server/demo/data";
import { PageHeader } from "@/components/shared/page-header";
import { AppointmentsView } from "@/features/appointments/appointments-view";

export const metadata: Metadata = { title: "Appointments" };

export default async function PortalAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await requireRole("PATIENT");
  const { new: openBook } = await searchParams;
  const me = patients.find((p) => p.id === PORTAL_PATIENT_ID)!;
  const mine = appointments
    .filter((a) => a.patientId === PORTAL_PATIENT_ID)
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
