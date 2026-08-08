"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { DateNavigator, isOnDay } from "@/components/shared/date-navigator";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate, humanizeEnum } from "@/lib/format";
import type { Invoice } from "@/types/domain";

export function InvoicesView({
  invoices,
  basePath,
}: {
  invoices: Invoice[];
  basePath: string;
}) {
  const router = useRouter();
  const [day, setDay] = useState<string | null>(null);
  const data = useMemo(() => invoices.filter((i) => isOnDay(i.createdAt, day)), [invoices, day]);
  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Invoice",
        cell: ({ row }) => <span className="font-medium">{row.original.number}</span>,
      },
      { accessorKey: "patientName", header: "Patient" },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.totalAmount)}</span>,
      },
      {
        accessorKey: "balanceAmount",
        header: "Balance",
        cell: ({ row }) => (
          <span className={row.original.balanceAmount > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
            {formatCurrency(row.original.balanceAmount)}
          </span>
        ),
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search invoice, patient…"
      pageSize={12}
      onRowClick={(i) => router.push(`${basePath}/${i.id}`)}
      emptyMessage="No invoices found"
      exportName="invoices"
      exportMapper={(i) => ({
        Invoice: i.number,
        Date: formatDate(i.createdAt),
        Patient: i.patientName,
        Subtotal: i.subtotal,
        Discount: i.discountAmount,
        Tax: i.taxAmount,
        Total: i.totalAmount,
        Paid: i.paidAmount,
        Balance: i.balanceAmount,
        Status: humanizeEnum(i.status),
        Payment: humanizeEnum(i.paymentStatus),
      })}
      toolbar={<DateNavigator value={day} onChange={setDay} />}
    />
  );
}
