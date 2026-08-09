import type { Metadata } from "next";
import { IndianRupee, Receipt, AlertCircle, CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getBillingSummary, listInvoices } from "@/server/services/billing.service";
import { db } from "@/server/repositories";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { InvoicesView } from "@/features/billing/invoices-view";
import { PharmacyBillDialog } from "@/features/billing/pharmacy-bill-dialog";
import { NewInvoiceDialog } from "@/features/billing/new-invoice-dialog";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Billing" };

export default async function AdminBillingPage() {
  const { user } = await requireRole("ADMIN");
  const [invoices, summary, branches, doctors, medicines, patients] = await Promise.all([
    listInvoices(user),
    getBillingSummary(user),
    db.branches.list(),
    db.doctors.list(),
    db.medicines.list(),
    db.patients.list(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Invoices, payments and collections."
        actions={
          <div className="flex flex-wrap gap-2">
            <NewInvoiceDialog
              defaultBranchId={user.branchId ?? "br_ravet"}
              patients={patients.filter((p) => p.isActive).map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }))}
              doctors={doctors.filter((d) => d.isActive).map((d) => ({ id: d.id, label: d.fullName, fee: d.consultationFee }))}
              branches={branches.filter((b) => b.isActive).map((b) => ({ id: b.id, label: b.name }))}
            />
            <PharmacyBillDialog
              branchId={user.branchId ?? "br_ravet"}
              medicines={medicines.filter((m) => m.isActive).map((m) => ({ id: m.id, name: m.name, stock: m.stockQty, unit: m.unit, price: m.sellPrice }))}
              patients={patients.filter((p) => p.isActive).map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }))}
            />
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's collection" value={formatCurrency(summary.todayCollection)} icon={IndianRupee} accent="success" />
        <StatCard label="Outstanding" value={formatCurrency(summary.outstanding)} icon={AlertCircle} accent="warning" />
        <StatCard label="Invoices" value={summary.invoiceCount} icon={Receipt} accent="primary" />
        <StatCard label="Fully paid" value={summary.paidCount} icon={CheckCircle2} accent="info" />
      </div>
      <InvoicesView invoices={invoices} basePath="/admin/billing" />
    </div>
  );
}
