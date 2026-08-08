import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { insurancePlans, patientInsurances } from "@/server/demo/extra";
import { PageHeader } from "@/components/shared/page-header";
import { InsuranceView } from "@/features/insurance/insurance-view";

export const metadata: Metadata = { title: "Insurance & TPA" };

export default async function AdminInsurancePage() {
  await requireRole("ADMIN");
  return (
    <div>
      <PageHeader title="Insurance & TPA" description="Insurance providers, TPAs and patient policies." />
      <InsuranceView plans={insurancePlans} policies={patientInsurances} />
    </div>
  );
}
