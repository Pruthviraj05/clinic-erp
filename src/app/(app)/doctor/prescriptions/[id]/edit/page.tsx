import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/guard";
import { getPrescription, listPrescriptions } from "@/server/services/prescriptions.service";
import { db } from "@/server/repositories";
import { getRxTemplatesFor } from "@/server/demo/template-store";
import { groupsForDoctor } from "@/server/demo/disease-store";
import { labTests, investigations as investigationMaster } from "@/server/demo/extra";
import { clinicFromBranch } from "@/lib/clinic";
import { ConsultScreen } from "@/features/consult/consult-screen";
import { PageHeader } from "@/components/shared/page-header";
import { DIAGNOSIS_SUGGESTIONS } from "@/features/consult/suggestions";
import type { Appointment } from "@/types/domain";

export const metadata: Metadata = { title: "Edit prescription" };

/** Revise a saved prescription using the same consult interface. */
export default async function EditPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requirePermission("prescriptions", "edit");
  const { id } = await params;

  // Scoped read — the save action checks ownership too, but the form must not
  // prefill another doctor's consultation in the first place.
  const rx = await getPrescription(id, user);
  if (!rx) notFound();
  const patient = await db.patients.get(rx.patientId);
  if (!patient) notFound();

  // The consult screen is appointment-shaped; reuse the originating appointment
  // when we can still find it, else synthesize a read-only stand-in.
  const allAppointments = await db.appointments.list();
  const source = allAppointments.find(
    (a) => a.patientId === rx.patientId && a.doctorId === rx.doctorId,
  );
  const clinic = await clinicFromBranch(rx.branchId);
  const appointment: Appointment = source ?? {
    id: `rx-${rx.id}`,
    branchId: rx.branchId,
    branchName: clinic.name,
    patientId: rx.patientId,
    patientName: rx.patientName,
    patientMrn: patient.mrn,
    doctorId: rx.doctorId,
    doctorName: rx.doctorName,
    type: "FOLLOW_UP",
    status: "COMPLETED",
    scheduledStart: rx.createdAt,
    scheduledEnd: rx.createdAt,
    tokenNumber: null,
    reason: null,
    paymentStatus: "PAID",
  };

  const [history, doctor, templates, medicines] = await Promise.all([
    listPrescriptions(user, patient.id).then((rows) => rows.filter((p) => p.id !== rx.id)),
    db.doctors.get(rx.doctorId),
    getRxTemplatesFor(user.linkId ?? user.id),
    db.medicines.list(),
  ]);
  const doctorMeta = [doctor?.qualifications, doctor?.registrationNo ? `Reg. ${doctor.registrationNo}` : null]
    .filter(Boolean)
    .join(" · ");

  const investigationSuggestions = [
    ...new Set([...labTests, ...investigationMaster].filter((r) => r.active).map((r) => r.name)),
  ];
  const diseaseGroups = await groupsForDoctor(rx.doctorId);

  return (
    <div className="space-y-4">
      <Link
        href={`/doctor/prescriptions/${rx.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to prescription
      </Link>
      <PageHeader
        title="Edit prescription"
        description={`Revising ${rx.id.toUpperCase()} · originally saved on ${new Date(rx.createdAt).toLocaleDateString("en-IN")}`}
      />
      <ConsultScreen
        appointment={appointment}
        patient={patient}
        history={history}
        templates={templates}
        drugOptions={medicines.filter((m) => m.isActive).map((m) => ({ name: m.name, sublabel: m.category ?? undefined }))}
        diagnosisSuggestions={DIAGNOSIS_SUGGESTIONS}
        investigationSuggestions={investigationSuggestions}
        clinic={clinic}
        doctorMeta={doctorMeta || undefined}
        rxSettings={await db.settings.get()}
        diseaseGroups={diseaseGroups.map((g) => ({
          id: g.id,
          name: g.name,
          hasPatient: g.patientIds.includes(patient.id),
        }))}
        prefill={{
          prescriptionId: rx.id,
          vitals: {
            bp: rx.vitals?.bp ?? "",
            pulse: rx.vitals?.pulse ? String(rx.vitals.pulse) : "",
            weightKg: rx.vitals?.weightKg ? String(rx.vitals.weightKg) : "",
            heightCm: rx.vitals?.heightCm ? String(rx.vitals.heightCm) : "",
            tempC: rx.vitals?.tempC ? String(rx.vitals.tempC) : "",
            spo2: rx.vitals?.spo2 ? String(rx.vitals.spo2) : "",
          },
          complaints: rx.symptoms ? rx.symptoms.split(",").map((s) => s.trim()).filter(Boolean) : [],
          notes: "",
          diagnoses: rx.diagnoses,
          medicines: rx.medicines,
          investigations: rx.investigations,
          advice: rx.advice ? [rx.advice] : [],
          followUpDate: rx.followUpDate ? rx.followUpDate.slice(0, 10) : "",
        }}
      />
    </div>
  );
}
