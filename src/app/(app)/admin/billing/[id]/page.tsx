import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getInvoice } from "@/server/services/billing.service";
import { InvoiceDetail } from "@/features/billing/invoice-detail";
import { clinicFromBranch } from "@/lib/clinic";
import { getBillDesignFor } from "@/server/demo/bill-design-store";

export const metadata: Metadata = { title: "Invoice" };

export default async function AdminInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireRole("ADMIN");
  const { id } = await params;
  const invoice = await getInvoice(user, id);
  if (!invoice) notFound();
  const [clinic, design] = await Promise.all([
    clinicFromBranch(invoice.branchId),
    getBillDesignFor(invoice.invoiceKind ?? "CONSULTATION"),
  ]);
  return (
    <div className="space-y-4">
      <Link href="/admin/billing" className="print-hide inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to billing
      </Link>
      <InvoiceDetail invoice={invoice} clinic={clinic} design={design} />
    </div>
  );
}
