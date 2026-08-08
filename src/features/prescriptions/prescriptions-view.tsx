"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { formatDate } from "@/lib/format";
import type { Prescription } from "@/types/domain";

export function PrescriptionsView({
  prescriptions,
  basePath,
}: {
  prescriptions: Prescription[];
  basePath: string;
}) {
  const router = useRouter();
  const columns = useMemo<ColumnDef<Prescription>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => <span className="font-medium">{formatDate(row.original.createdAt)}</span>,
      },
      { accessorKey: "patientName", header: "Patient" },
      { accessorKey: "doctorName", header: "Doctor" },
      {
        id: "diagnosis",
        header: "Diagnosis",
        cell: ({ row }) => <span className="text-sm">{row.original.diagnoses.join(", ")}</span>,
      },
      {
        id: "medicines",
        header: "Medicines",
        cell: ({ row }) => (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{row.original.medicines.length} items</span>
        ),
      },
      {
        accessorKey: "followUpDate",
        header: "Follow-up",
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.followUpDate)}</span>,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={prescriptions}
      searchPlaceholder="Search patient, diagnosis…"
      pageSize={12}
      onRowClick={(p) => router.push(`${basePath}/${p.id}`)}
      emptyMessage="No prescriptions found"
    />
  );
}
