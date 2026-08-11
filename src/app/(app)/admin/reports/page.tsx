import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { ReportsView } from "@/features/reports/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  await requireRole("ADMIN");
  const [branches, doctors, invoices, appointments, patients, stockMovements] = await Promise.all([
    db.branches.list(),
    db.doctors.list(),
    db.invoices.list(),
    db.appointments.list(),
    db.patients.list(),
    db.stockMovements.list(),
  ]);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Open a report to see the underlying data, filter it, and export only what you filtered."
      />
      <ReportsView
        context={{ invoices, appointments, patients, stockMovements, doctors, branches }}
        branchOptions={branches.map((b) => ({ id: b.id, label: b.name }))}
        doctorOptions={doctors.filter((d) => d.isActive).map((d) => ({ id: d.id, label: d.fullName }))}
      />
    </div>
  );
}
