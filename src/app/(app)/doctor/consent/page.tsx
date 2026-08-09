import type { Metadata } from "next";
import { requirePermission } from "@/lib/guard";
import { db } from "@/server/repositories";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { ConsentView } from "@/features/consent/consent-view";

export const metadata: Metadata = { title: "Consent Forms" };

/** Consent forms assigned to this doctor — editable until the patient signs. */
export default async function DoctorConsentPage() {
  const { user } = await requirePermission("consent", "view");
  const [allConsentForms, doctors] = await Promise.all([db.consentForms.list(), db.doctors.list()]);
  const mine = allConsentForms.filter((c) => c.doctorId === user.linkId);
  const doctorOptions = doctors
    .filter((d) => d.isActive)
    .map((d) => ({ id: d.id, label: d.fullName, sublabel: d.specialization ?? undefined }));

  return (
    <div>
      <PageHeader
        title="Consent forms"
        description="Forms the front desk assigned to you. Edit the wording or clinical details before the patient signs."
      />
      <ConsentView forms={mine} canEdit={can(user.role, "consent", "edit")} doctors={doctorOptions} />
    </div>
  );
}
