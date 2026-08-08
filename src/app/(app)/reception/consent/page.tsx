import type { Metadata } from "next";
import { requirePermission } from "@/lib/guard";
import { consentForms } from "@/server/demo/extra";
import { doctors, patients } from "@/server/demo/data";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { ConsentView } from "@/features/consent/consent-view";
import { ConsentFormDialog } from "@/features/consent/consent-form-dialog";

export const metadata: Metadata = { title: "Consent Forms" };

/** Front desk fills consent forms and assigns the doctor they concern. */
export default async function ReceptionConsentPage() {
  const { user } = await requirePermission("consent", "view");

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
        description="Fill the form, assign the treating doctor, and the patient signs on the portal."
        actions={
          can(user.role, "consent", "create") ? (
            <ConsentFormDialog patients={patientOptions} doctors={doctorOptions} />
          ) : undefined
        }
      />
      <ConsentView
        forms={consentForms}
        canEdit={can(user.role, "consent", "edit")}
        doctors={doctorOptions}
      />
    </div>
  );
}
