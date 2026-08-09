import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsView } from "@/features/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireRole("ADMIN");
  const [branches, doctors, invoices] = await Promise.all([
    db.branches.list(),
    db.doctors.list(),
    db.invoices.list(),
  ]);

  const branchRevenue = branches.map((b) => ({
    label: b.name,
    value: invoices.filter((i) => i.branchId === b.id).reduce((sum, i) => sum + i.paidAmount, 0),
  }));

  // Every invoice's branch maps to the doctor(s) active at that branch. With a
  // single doctor per branch (the common case for this clinic) this is exact;
  // if a branch ever has multiple doctors, revenue is split evenly among them
  // since invoices aren't attributed to a specific doctor.
  const doctorRevenue = doctors.map((d) => {
    const theirBranches = new Set(d.branchIds);
    const theirInvoices = invoices.filter((i) => theirBranches.has(i.branchId));
    const doctorsSharingBranch = (branchId: string) => doctors.filter((x) => x.branchIds.includes(branchId)).length || 1;
    return {
      label: d.fullName,
      value: theirInvoices.reduce((sum, i) => sum + i.paidAmount / doctorsSharingBranch(i.branchId), 0),
    };
  });

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export operational and financial reports." />
      <ReportsView branchRevenue={branchRevenue} doctorRevenue={doctorRevenue} />
    </div>
  );
}
