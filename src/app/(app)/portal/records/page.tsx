import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { PORTAL_PATIENT_ID } from "@/server/demo/data";
import { medicalRecords } from "@/server/demo/extra";
import { PageHeader } from "@/components/shared/page-header";
import { RecordsView } from "@/features/records/records-view";

export const metadata: Metadata = { title: "Medical Records" };

export default async function PortalRecordsPage() {
  await requireRole("PATIENT");
  const records = medicalRecords
    .filter((r) => r.patientId === PORTAL_PATIENT_ID)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  return (
    <div>
      <PageHeader title="Medical records" description="Your lab reports, scans and documents." />
      <RecordsView records={records} />
    </div>
  );
}
