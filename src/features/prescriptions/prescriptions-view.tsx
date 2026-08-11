"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { formatDate } from "@/lib/format";
import type { Prescription } from "@/types/domain";

const fieldClass =
  "h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PrescriptionsView({
  prescriptions,
  basePath,
  /** Hide the redundant "Doctor" column on a doctor's own list — every row is them. */
  showDoctorColumn = true,
}: {
  prescriptions: Prescription[];
  basePath: string;
  showDoctorColumn?: boolean;
}) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [patientFilter, setPatientFilter] = useState("");

  const patientOptions = useMemo(
    () => [...new Set(prescriptions.map((p) => p.patientName))].sort(),
    [prescriptions],
  );

  const filtered = useMemo(
    () =>
      prescriptions
        .filter((p) => !from || p.createdAt.slice(0, 10) >= from)
        .filter((p) => !to || p.createdAt.slice(0, 10) <= to)
        .filter((p) => !patientFilter || p.patientName === patientFilter),
    [prescriptions, from, to, patientFilter],
  );

  const columns = useMemo<ColumnDef<Prescription>[]>(() => {
    const cols: ColumnDef<Prescription>[] = [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => <span className="font-medium">{formatDate(row.original.createdAt)}</span>,
      },
      { accessorKey: "patientName", header: "Patient" },
    ];
    if (showDoctorColumn) cols.push({ accessorKey: "doctorName", header: "Doctor" });
    cols.push(
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
    );
    return cols;
  }, [showDoctorColumn]);

  return (
    <DataTable
      columns={columns}
      data={filtered}
      searchPlaceholder="Search patient, diagnosis…"
      pageSize={12}
      onRowClick={(p) => router.push(`${basePath}/${p.id}`)}
      emptyMessage="No prescriptions match your filters"
      exportName="prescriptions"
      exportMapper={(p) => ({
        Date: formatDate(p.createdAt),
        Patient: p.patientName,
        Doctor: p.doctorName,
        Diagnosis: p.diagnoses.join(", "),
        Medicines: p.medicines.length,
        FollowUp: formatDate(p.followUpDate),
      })}
      toolbar={
        <>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            title="From date"
            className={fieldClass}
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            title="To date"
            className={fieldClass}
          />
          {patientOptions.length > 1 && (
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className={fieldClass}
            >
              <option value="">All patients</option>
              {patientOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
        </>
      }
    />
  );
}
