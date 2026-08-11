import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { ConsentView } from "@/features/consent/consent-view";

export const metadata: Metadata = { title: "Consent Forms" };

export default async function PortalConsentPage() {
  const { user } = await requireRole("PATIENT");
  const all = await db.consentForms.list();
  const forms = all.filter((c) => c.patientId === user.linkId);
  return (
    <div>
      <PageHeader title="Consent forms" description="Review and sign consent forms for your care." />
      <ConsentView forms={forms} canSign detailBasePath="/portal/consent" />
    </div>
  );
}
