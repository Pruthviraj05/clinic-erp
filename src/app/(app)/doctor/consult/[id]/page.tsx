import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getAppointment } from "@/server/services/appointments.service";
import { listPrescriptions } from "@/server/services/prescriptions.service";
import { db } from "@/server/repositories";
import { getRxTemplatesFor } from "@/server/demo/template-store";
import { groupsForDoctor } from "@/server/demo/disease-store";
import { labTests, investigations as investigationMaster } from "@/server/demo/extra";
import { clinicFromBranch } from "@/lib/clinic";
import { ConsultScreen } from "@/features/consult/consult-screen";
import { DIAGNOSIS_SUGGESTIONS } from "@/features/consult/suggestions";

export const metadata: Metadata = { title: "Consultation" };

export default async function DoctorConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireRole("DOCTOR");
  const { id } = await params;

  const appointment = await getAppointment(user, id);
  if (!appointment) notFound();

  const patient = await db.patients.get(appointment.patientId);
  if (!patient) notFound();

  const [history, doctor, templates, medicines, prescriptionTemplate, diseaseGroups, clinic] = await Promise.all([
    listPrescriptions(user, patient.id),
    db.doctors.get(appointment.doctorId),
    getRxTemplatesFor(user.linkId ?? appointment.doctorId),
    db.medicines.list(),
    db.settings.get(),
    groupsForDoctor(appointment.doctorId),
    clinicFromBranch(appointment.branchId),
  ]);

  const doctorMeta = [doctor?.qualifications, doctor?.registrationNo ? `Reg. ${doctor.registrationNo}` : null]
    .filter(Boolean)
    .join(" · ");

  const drugOptions = medicines
    .filter((m) => m.isActive)
    .map((m) => ({ name: m.name, sublabel: m.category ?? undefined }));
  const investigationSuggestions = [
    ...new Set([...labTests, ...investigationMaster].filter((r) => r.active).map((r) => r.name)),
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/doctor/consult"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to queue
      </Link>
      <ConsultScreen
        appointment={appointment}
        patient={patient}
        history={history}
        templates={templates}
        drugOptions={drugOptions}
        diagnosisSuggestions={DIAGNOSIS_SUGGESTIONS}
        investigationSuggestions={investigationSuggestions}
        clinic={clinic}
        doctorMeta={doctorMeta || undefined}
        rxSettings={prescriptionTemplate}
        diseaseGroups={diseaseGroups.map((g) => ({
          id: g.id,
          name: g.name,
          hasPatient: g.patientIds.includes(patient.id),
        }))}
      />
    </div>
  );
}
