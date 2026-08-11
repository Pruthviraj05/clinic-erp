import type { Metadata } from "next";
import { requirePermission } from "@/lib/guard";
import { db } from "@/server/repositories";
import { getCachedDoctors } from "@/server/cache/reference-data";
import { can } from "@/lib/rbac";
import { getPatientBundle } from "@/server/services/patients.service";
import { PageHeader } from "@/components/shared/page-header";
import { ConsentView, type PatientHistoryEntry } from "@/features/consent/consent-view";

export const metadata: Metadata = { title: "Consent Forms" };

/** Consent forms assigned to this doctor — editable until the patient signs. */
export default async function DoctorConsentPage() {
  const { user } = await requirePermission("consent", "view");
  const [allConsentForms, doctors] = await Promise.all([db.consentForms.list(), getCachedDoctors()]);
  const mine = allConsentForms.filter((c) => c.doctorId === user.linkId);
  const doctorOptions = doctors
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, label: d.fullName, sublabel: d.specialization ?? undefined }));

  const patientIds = [...new Set(mine.map((f) => f.patientId))];
  const bundles = await Promise.all(patientIds.map((id) => getPatientBundle(id)));
  const patientHistory: Record<string, PatientHistoryEntry> = {};
  for (const b of bundles) {
    if (!b) continue;
    patientHistory[b.patient.id] = { prescriptions: b.prescriptions, records: b.records };
  }

  return (
    <div>
      <PageHeader
        title="Consent forms"
        description="Forms the front desk assigned to you. Edit the wording or clinical details before the patient signs."
      />
      <ConsentView
        forms={mine}
        canEdit={can(user.role, "consent", "edit")}
        canDoctorSign={can(user.role, "consent", "edit")}
        doctors={doctorOptions}
        patientHistory={patientHistory}
        canAddRecords={can(user.role, "emr", "create")}
        detailBasePath="/doctor/consent"
      />
    </div>
  );
}
