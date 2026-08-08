import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { listPrescriptions } from "@/server/services/prescriptions.service";
import { PageHeader } from "@/components/shared/page-header";
import { PrescriptionsView } from "@/features/prescriptions/prescriptions-view";

export const metadata: Metadata = { title: "Prescriptions" };

export default async function AdminPrescriptionsPage() {
  const { user } = await requireRole("ADMIN");
  const prescriptions = await listPrescriptions(user);
  return (
    <div>
      <PageHeader title="Prescriptions" description="All issued prescriptions." />
      <PrescriptionsView prescriptions={prescriptions} basePath="/admin/prescriptions" />
    </div>
  );
}
