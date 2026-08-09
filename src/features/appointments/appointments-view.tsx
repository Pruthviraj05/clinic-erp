"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { DateNavigator, isOnDay } from "@/components/shared/date-navigator";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookAppointmentDialog, type RefOption } from "./book-appointment-dialog";
import { RescheduleDialog } from "./reschedule-dialog";
import { updateAppointmentStatusAction } from "@/server/actions/appointment.actions";
import { formatDate, formatTime, humanizeEnum, initials } from "@/lib/format";
import type { Appointment, AppointmentStatus } from "@/types/domain";

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All statuses", value: "ALL" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Checked in", value: "CHECKED_IN" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "No show", value: "NO_SHOW" },
];

// Which status transitions are offered from a given status.
const NEXT_STATUSES: Record<string, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: ["SCHEDULED"],
  NO_SHOW: ["SCHEDULED"],
  RESCHEDULED: ["CONFIRMED", "CANCELLED"],
};

export function AppointmentsView({
  appointments,
  branches,
  doctors,
  patients,
  canBook = true,
  canManage = true,
  defaultBranchId,
  showDate = true,
  fixedPatient,
  autoOpenBook = false,
}: {
  appointments: Appointment[];
  branches: RefOption[];
  doctors: RefOption[];
  patients: RefOption[];
  canBook?: boolean;
  canManage?: boolean;
  defaultBranchId?: string;
  showDate?: boolean;
  /** Pin bookings to one patient (patient portal). */
  fixedPatient?: RefOption;
  /** Open the booking dialog on mount (deep link). */
  autoOpenBook?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [day, setDay] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [pending, startTransition] = useTransition();

  const data = useMemo(
    () =>
      appointments
        .filter((a) => statusFilter === "ALL" || a.status === statusFilter)
        .filter((a) => isOnDay(a.scheduledStart, day)),
    [appointments, statusFilter, day],
  );

  function changeStatus(id: string, status: AppointmentStatus) {
    startTransition(async () => {
      const res = await updateAppointmentStatusAction(id, status);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not update status");
    });
  }

  const columns = useMemo<ColumnDef<Appointment>[]>(() => {
    const cols: ColumnDef<Appointment>[] = [
      {
        accessorKey: "tokenNumber",
        header: "Token",
        cell: ({ row }) =>
          row.original.tokenNumber ? (
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">
              {row.original.tokenNumber}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "scheduledStart",
        header: "When",
        cell: ({ row }) => (
          <div className="leading-tight">
            <div className="font-medium">{formatTime(row.original.scheduledStart)}</div>
            {showDate && (
              <div className="text-xs text-muted-foreground">
                {formatDate(row.original.scheduledStart, { day: "2-digit", month: "short" })}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "patientName",
        header: "Patient",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials(row.original.patientName)}
              </AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <div className="font-medium">{row.original.patientName}</div>
              <div className="text-xs text-muted-foreground">{row.original.patientMrn}</div>
            </div>
          </div>
        ),
      },
      { accessorKey: "doctorName", header: "Doctor" },
      { accessorKey: "branchName", header: "Branch" },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <span className="text-sm">{humanizeEnum(row.original.type)}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
      },
    ];

    if (canManage) {
      cols.push({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const next = NEXT_STATUSES[row.original.status] ?? [];
          const canReschedule = ["SCHEDULED", "CONFIRMED", "RESCHEDULED"].includes(row.original.status);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Actions"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Update status</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {canReschedule && (
                  <DropdownMenuItem
                    disabled={pending}
                    onClick={() => setRescheduling(row.original)}
                  >
                    Reschedule…
                  </DropdownMenuItem>
                )}
                {next.length ? (
                  next.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      disabled={pending}
                      variant={s === "CANCELLED" || s === "NO_SHOW" ? "destructive" : "default"}
                      onClick={() => changeStatus(row.original.id, s)}
                    >
                      Mark {humanizeEnum(s).toLowerCase()}
                    </DropdownMenuItem>
                  ))
                ) : (
                  !canReschedule && <DropdownMenuItem disabled>No actions</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      });
    }
    return cols;
  }, [canManage, pending, showDate]);

  return (
    <>
    <DataTable
      columns={columns}
      data={data}
      searchable
      searchPlaceholder="Search patient, doctor, MRN…"
      pageSize={12}
      emptyMessage="No appointments match your filters"
      exportName="appointments"
      exportMapper={(a) => ({
        Token: a.tokenNumber ?? "",
        Date: formatDate(a.scheduledStart),
        Time: formatTime(a.scheduledStart),
        Patient: a.patientName,
        MRN: a.patientMrn,
        Doctor: a.doctorName,
        Branch: a.branchName,
        Type: humanizeEnum(a.type),
        Status: humanizeEnum(a.status),
        Payment: humanizeEnum(a.paymentStatus),
        Reason: a.reason ?? "",
      })}
      toolbar={
        <>
          <DateNavigator value={day} onChange={setDay} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 shrink-0 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          {canBook && (
            <BookAppointmentDialog
              branches={branches}
              doctors={doctors}
              patients={patients}
              defaultBranchId={defaultBranchId}
              fixedPatient={fixedPatient}
              defaultOpen={autoOpenBook}
            />
          )}
        </>
      }
    />
    {rescheduling && (
      <RescheduleDialog
        appointment={rescheduling}
        open
        onOpenChange={(open) => {
          if (!open) setRescheduling(null);
        }}
      />
    )}
    </>
  );
}
