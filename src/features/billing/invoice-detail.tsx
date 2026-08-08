"use client";

import { Activity, Printer, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Invoice } from "@/types/domain";
import type { ClinicInfo } from "@/features/prescriptions/prescription-detail";

/** Printable GST invoice. Same print-isolation approach as prescriptions. */
export function InvoiceDetail({
  invoice: inv,
  clinic,
  canCollect = false,
}: {
  invoice: Invoice;
  clinic: ClinicInfo;
  canCollect?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="print-hide flex flex-wrap items-center justify-end gap-2">
        {canCollect && inv.balanceAmount > 0 && (
          <RecordPaymentDialog invoiceId={inv.id} invoiceNumber={inv.number} balance={inv.balanceAmount} />
        )}
        <Button variant="outline" onClick={() => toast.success("Receipt shared (demo)")}>
          <Share2 className="size-4" /> Share
        </Button>
        <Button variant="outline" onClick={() => toast.success("PDF generated (demo)")}>
          <Download className="size-4" /> Download
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" /> Print
        </Button>
      </div>

      <div className="print-area mx-auto max-w-3xl rounded-xl border bg-card p-4 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{clinic.name}</h1>
              <p className="text-sm text-muted-foreground">{clinic.address}</p>
              <p className="text-sm text-muted-foreground">
                {clinic.phone}{clinic.gst ? ` · GSTIN: ${clinic.gst}` : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">TAX INVOICE</p>
            <p className="text-sm font-medium">{inv.number}</p>
            <p className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-b py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Billed to</p>
            <p className="font-medium">{inv.patientName}</p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={inv.status} />
            <StatusBadge status={inv.paymentStatus} />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[480px] py-4 text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2.5">{it.description}</td>
                <td className="py-2.5 text-right">{it.quantity}</td>
                <td className="py-2.5 text-right">{formatCurrency(it.unitPrice)}</td>
                <td className="py-2.5 text-right font-medium">{formatCurrency(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="flex justify-end pt-2">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(inv.subtotal)} />
            {inv.discountAmount > 0 && <Row label="Discount" value={`− ${formatCurrency(inv.discountAmount)}`} />}
            <Row label="Tax (GST)" value={formatCurrency(inv.taxAmount)} />
            <div className="my-1 border-t" />
            <Row label="Total" value={formatCurrency(inv.totalAmount)} bold />
            <Row label="Paid" value={formatCurrency(inv.paidAmount)} />
            <Row label="Balance due" value={formatCurrency(inv.balanceAmount)} bold danger={inv.balanceAmount > 0} />
          </dl>
        </div>

        <p className="mt-6 border-t pt-4 text-center text-[11px] text-muted-foreground">
          This is a computer-generated invoice. Thank you for choosing {clinic.name}.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, bold, danger }: { label: string; value: string; bold?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</dt>
      <dd className={`${bold ? "font-semibold" : ""} ${danger ? "text-destructive" : ""}`}>{value}</dd>
    </div>
  );
}
