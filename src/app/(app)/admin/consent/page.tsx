import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { ConsentView } from "@/features/consent/consent-view";
import { ConsentFormDialog } from "@/features/consent/consent-form-dialog";

export const metadata: Metadata = { title: "Consent Forms" };

export default async function AdminConsentPage() {
  const { user } = await requireRole("ADMIN");
  const [doctors, patients, consentForms] = await Promise.all([db.doctors.list(), db.patients.list(), db.consentForms.list()]);
  const doctorOptions = doctors
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, label: d.fullName, sublabel: d.specialization ?? undefined }));
  const patientOptions = patients
    .filter((p) => p.isActive)
    .map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }));

  return (
    <div>
      <PageHeader
        title="Consent forms"
        description="Digital consent with e-signatures, fully auditable."
        actions={
          can(user.role, "consent", "create") ? (
            <ConsentFormDialog patients={patientOptions} doctors={doctorOptions} />
          ) : undefined
        }
      />
      <ConsentView forms={consentForms} doctors={doctorOptions} />
    </div>
  );
}
