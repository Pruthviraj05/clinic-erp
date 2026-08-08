import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { getInvoice } from "@/server/services/billing.service";
import { PORTAL_PATIENT_ID } from "@/server/demo/data";
import { InvoiceDetail } from "@/features/billing/invoice-detail";
import { clinicFromBranch } from "@/lib/clinic";

export const metadata: Metadata = { title: "Invoice" };

export default async function PortalInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireRole("PATIENT");
  const { id } = await params;
  const invoice = await getInvoice(user, id);
  if (!invoice || invoice.patientId !== PORTAL_PATIENT_ID) notFound();
  return (
    <div className="space-y-4">
      <Link href="/portal/billing" className="print-hide inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to bills
      </Link>
      <InvoiceDetail invoice={invoice} clinic={clinicFromBranch(invoice.branchId)} />
    </div>
  );
}
