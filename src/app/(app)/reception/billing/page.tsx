import type { Metadata } from "next";
import { IndianRupee, Receipt, AlertCircle, CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getBillingSummary, listInvoices } from "@/server/services/billing.service";
import { getPrescription } from "@/server/services/prescriptions.service";
import { matchPrescribedMedicines } from "@/lib/medicine-match";
import { db } from "@/server/repositories";
import { toMedicineOptions } from "@/lib/medicine-options";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { InvoicesView } from "@/features/billing/invoices-view";
import { PharmacyBillDialog } from "@/features/billing/pharmacy-bill-dialog";
import { NewInvoiceDialog } from "@/features/billing/new-invoice-dialog";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Billing" };

export default async function ReceptionBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; prescriptionId?: string }>;
}) {
  const { user } = await requireRole("RECEPTIONIST");
  const { patientId: prefillPatientId, prescriptionId } = await searchParams;
  const [invoices, summary, branches, doctors, medicines, batches, patients, prescription] = await Promise.all([
    listInvoices(user),
    getBillingSummary(user),
    db.branches.list(),
    db.doctors.list(),
    db.medicines.list(),
    db.medicineBatches.list(),
    db.patients.list(),
    prescriptionId ? getPrescription(prescriptionId) : Promise.resolve(null),
  ]);

  const activeMedicines = medicines.filter((m) => m.isActive);
  let initialLines: { medicineId: string; quantity: number }[] | undefined;
  let unmatchedNames: string[] | undefined;
  if (prescription && prescription.patientId === prefillPatientId) {
    const { lines, unmatched } = matchPrescribedMedicines(
      prescription.medicines.map((m) => m.name),
      activeMedicines,
    );
    initialLines = lines.length ? lines : undefined;
    unmatchedNames = unmatched.length ? unmatched : undefined;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Invoices and collections for your branch."
        actions={
          <div className="flex flex-wrap gap-2">
            <NewInvoiceDialog
              defaultBranchId={user.branchId ?? "br_ravet"}
              patients={patients.filter((p) => p.isActive).map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }))}
              doctors={doctors.filter((d) => d.isActive).map((d) => ({ id: d.id, label: d.fullName, fee: d.consultationFee }))}
              branches={branches.filter((b) => b.isActive && (!user.branchId || b.id === user.branchId)).map((b) => ({ id: b.id, label: b.name }))}
            />
            <PharmacyBillDialog
              branchId={user.branchId ?? "br_ravet"}
              medicines={toMedicineOptions(activeMedicines, batches)}
              patients={patients.filter((p) => p.isActive).map((p) => ({ id: p.id, label: p.fullName, sublabel: p.mrn }))}
              initialPatientId={prefillPatientId}
              initialLines={initialLines}
              unmatchedNames={unmatchedNames}
              autoOpen={Boolean(prefillPatientId && prescriptionId)}
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
      <InvoicesView invoices={invoices} basePath="/reception/billing" />
    </div>
  );
}
