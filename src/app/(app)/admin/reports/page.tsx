import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { branchRevenue, doctorRevenue } from "@/server/demo/extra";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsView } from "@/features/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireRole("ADMIN");
  return (
    <div>
      <PageHeader title="Reports" description="Generate and export operational and financial reports." />
      <ReportsView branchRevenue={branchRevenue} doctorRevenue={doctorRevenue} />
    </div>
  );
}
