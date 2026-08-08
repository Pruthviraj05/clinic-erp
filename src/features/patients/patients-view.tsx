"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
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
import { RegisterPatientDialog } from "./register-patient-dialog";
import { EditPatientDialog } from "./edit-patient-dialog";
import { setPatientActiveAction } from "@/server/actions/patient.actions";
import { formatAge, formatDate, humanizeEnum, initials } from "@/lib/format";
import type { Patient } from "@/types/domain";

export function PatientsView({
  patients,
  basePath,
  canRegister = true,
  canEdit = false,
  canDelete = false,
}: {
  patients: Patient[];
  basePath: string;
  canRegister?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Patient | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleActive(patient: Patient) {
    startTransition(async () => {
      const res = await setPatientActiveAction(patient.id, !patient.isActive);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not update patient");
    });
  }

  const columns = useMemo<ColumnDef<Patient>[]>(() => {
    const cols: ColumnDef<Patient>[] = [
      {
        accessorKey: "fullName",
        header: "Patient",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials(row.original.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <div className="font-medium">{row.original.fullName}</div>
              <div className="text-xs text-muted-foreground">{row.original.mrn}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "gender",
        header: "Gender / Age",
        cell: ({ row }) => (
          <span className="text-sm">
            {humanizeEnum(row.original.gender)} · {formatAge(row.original.dateOfBirth)}
          </span>
        ),
      },
      { accessorKey: "phone", header: "Phone" },
      {
        accessorKey: "bloodGroup",
        header: "Blood",
        cell: ({ row }) => <span className="text-sm">{row.original.bloodGroup.replace("_", " ")}</span>,
      },
      { accessorKey: "city", header: "City" },
      {
        accessorKey: "lastVisitAt",
        header: "Last visit",
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.lastVisitAt)}</span>,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? "ACTIVE" : "INACTIVE"} />,
      },
    ];

    if (canEdit || canDelete) {
      cols.push({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Actions"
                  className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Patient</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setEditing(p)}>Edit…</DropdownMenuItem>
                  )}
                  {p.isActive
                    ? canDelete && (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={pending}
                          onClick={() => toggleActive(p)}
                        >
                          Deactivate
                        </DropdownMenuItem>
                      )
                    : canEdit && (
                        <DropdownMenuItem disabled={pending} onClick={() => toggleActive(p)}>
                          Reactivate
                        </DropdownMenuItem>
                      )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      });
    }
    return cols;
     
  }, [canEdit, canDelete, pending]);

  return (
    <>
      <DataTable
        columns={columns}
        data={patients}
        searchPlaceholder="Search name, MRN, phone…"
        pageSize={12}
        onRowClick={(p) => router.push(`${basePath}/${p.id}`)}
        emptyMessage="No patients found"
        exportName="patients"
        exportMapper={(p) => ({
          MRN: p.mrn,
          Name: p.fullName,
          Gender: humanizeEnum(p.gender),
          Age: formatAge(p.dateOfBirth),
          Phone: p.phone,
          Email: p.email ?? "",
          BloodGroup: p.bloodGroup.replace("_", " "),
          City: p.city ?? "",
          LastVisit: formatDate(p.lastVisitAt),
          Status: p.isActive ? "Active" : "Inactive",
        })}
        toolbar={canRegister ? <RegisterPatientDialog /> : undefined}
      />
      {editing && (
        <EditPatientDialog
          key={editing.id}
          patient={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </>
  );
}
