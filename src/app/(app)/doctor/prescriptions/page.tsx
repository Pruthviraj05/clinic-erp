import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { listPrescriptions } from "@/server/services/prescriptions.service";
import { PageHeader } from "@/components/shared/page-header";
import { PrescriptionsView } from "@/features/prescriptions/prescriptions-view";

export const metadata: Metadata = { title: "Prescriptions" };

export default async function DoctorPrescriptionsPage() {
  const { user } = await requireRole("DOCTOR");
  const prescriptions = await listPrescriptions(user);
  return (
    <div>
      <PageHeader title="Prescriptions" description="Prescriptions you have written." />
      <PrescriptionsView prescriptions={prescriptions} basePath="/doctor/prescriptions" showDoctorColumn={false} />
    </div>
  );
}
