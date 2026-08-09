import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { RecordsView } from "@/features/records/records-view";

export const metadata: Metadata = { title: "Medical Records" };

export default async function PortalRecordsPage() {
  const { user } = await requireRole("PATIENT");
  const all = await db.medicalRecords.list();
  const records = all
    .filter((r) => r.patientId === user.linkId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  return (
    <div>
      <PageHeader title="Medical records" description="Your lab reports, scans and documents." />
      <RecordsView records={records} />
    </div>
  );
}
