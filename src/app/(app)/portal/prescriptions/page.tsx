import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { listPrescriptions } from "@/server/services/prescriptions.service";
import { PORTAL_PATIENT_ID } from "@/server/demo/data";
import { PageHeader } from "@/components/shared/page-header";
import { PrescriptionsView } from "@/features/prescriptions/prescriptions-view";

export const metadata: Metadata = { title: "Prescriptions" };

export default async function PortalPrescriptionsPage() {
  const { user } = await requireRole("PATIENT");
  const prescriptions = await listPrescriptions(user, PORTAL_PATIENT_ID);
  return (
    <div>
      <PageHeader title="My prescriptions" description="Download or view your prescriptions." />
      <PrescriptionsView prescriptions={prescriptions} basePath="/portal/prescriptions" />
    </div>
  );
}
