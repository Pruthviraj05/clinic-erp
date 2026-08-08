import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { consentForms } from "@/server/demo/extra";
import { PORTAL_PATIENT_ID } from "@/server/demo/data";
import { PageHeader } from "@/components/shared/page-header";
import { ConsentView } from "@/features/consent/consent-view";

export const metadata: Metadata = { title: "Consent Forms" };

export default async function PortalConsentPage() {
  await requireRole("PATIENT");
  const forms = consentForms.filter((c) => c.patientId === PORTAL_PATIENT_ID);
  return (
    <div>
      <PageHeader title="Consent forms" description="Review and sign consent forms for your care." />
      <ConsentView forms={forms} canSign />
    </div>
  );
}
