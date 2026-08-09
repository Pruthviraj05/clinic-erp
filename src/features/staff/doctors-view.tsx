"use client";

import { useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { DoctorDialog, type BranchOption } from "./doctor-dialog";
import { setDoctorActiveAction } from "@/server/actions/staff.actions";
import { formatCurrency, initials } from "@/lib/format";
import type { Doctor } from "@/types/domain";

export function DoctorsView({
  doctors,
  branchNames,
  branchOptions,
  specializationOptions,
  departmentOptions,
  canCreate,
  canEdit,
  canDelete,
}: {
  doctors: Doctor[];
  branchNames: Record<string, string>;
  branchOptions: BranchOption[];
  specializationOptions: string[];
  departmentOptions: string[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [pending, startTransition] = useTransition();

  const setActive = (id: string, active: boolean) => {
    startTransition(async () => {
      const res = await setDoctorActiveAction(id, active);
      if (res.ok) toast.success(res.message);
      else if (res.message) toast.error(res.message);
    });
  };

  const columns = useMemo<ColumnDef<Doctor>[]>(() => {
    const cols: ColumnDef<Doctor>[] = [
      {
        accessorKey: "fullName",
        header: "Doctor",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(row.original.fullName)}</AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <div className="font-medium">{row.original.fullName}</div>
              <div className="text-xs text-muted-foreground">{row.original.qualifications}</div>
            </div>
          </div>
        ),
      },
      { accessorKey: "specialization", header: "Specialization" },
      { accessorKey: "department", header: "Department" },
      {
        id: "branches",
        header: "Branches",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.branchIds.map((b) => branchNames[b] ?? b).join(", ")}</span>
        ),
      },
      {
        accessorKey: "consultationFee",
        header: "Fee",
        cell: ({ row }) => <span>{formatCurrency(row.original.consultationFee)}</span>,
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
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Actions"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Doctor</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {canEdit && (
                <DropdownMenuItem onClick={() => setEditing(row.original)}>Edit</DropdownMenuItem>
              )}
              {row.original.isActive
                ? canDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={pending}
                      onClick={() => setActive(row.original.id, false)}
                    >
                      Deactivate
                    </DropdownMenuItem>
                  )
                : canEdit && (
                    <DropdownMenuItem disabled={pending} onClick={() => setActive(row.original.id, true)}>
                      Reactivate
                    </DropdownMenuItem>
                  )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    }
     
    return cols;
  }, [branchNames, canEdit, canDelete, pending]);

  return (
    <>
      {editing && (
        <DoctorDialog
          doctor={editing}
          branchOptions={branchOptions}
          specializationOptions={specializationOptions}
          departmentOptions={departmentOptions}
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      )}
      <DataTable
        columns={columns}
        data={doctors}
        searchPlaceholder="Search doctor, specialization…"
        emptyMessage="No doctors found"
        toolbar={
          canCreate ? (
            <DoctorDialog
              branchOptions={branchOptions}
              specializationOptions={specializationOptions}
              departmentOptions={departmentOptions}
            />
          ) : undefined
        }
      />
    </>
  );
}
