import type { Metadata } from "next";
import { requireRole } from "@/lib/guard";
import { listInvoices } from "@/server/services/billing.service";
import { PageHeader } from "@/components/shared/page-header";
import { InvoicesView } from "@/features/billing/invoices-view";

export const metadata: Metadata = { title: "Billing" };

export default async function PortalBillingPage() {
  const { user } = await requireRole("PATIENT");
  const invoices = await listInvoices(user, user.linkId);
  return (
    <div>
      <PageHeader title="My bills" description="View and download your invoices." />
      <InvoicesView invoices={invoices} basePath="/portal/billing" />
    </div>
  );
}
