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
import { ReceptionistDialog } from "./receptionist-dialog";
import type { BranchOption } from "./doctor-dialog";
import { setReceptionistActiveAction } from "@/server/actions/staff.actions";
import { initials } from "@/lib/format";
import type { Receptionist } from "@/types/domain";

export function ReceptionistsView({
  receptionists,
  branchNames,
  branchOptions,
  canCreate,
  canEdit,
  canDelete,
}: {
  receptionists: Receptionist[];
  branchNames: Record<string, string>;
  branchOptions: BranchOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState<Receptionist | null>(null);
  const [pending, startTransition] = useTransition();

  const setActive = (id: string, active: boolean) => {
    startTransition(async () => {
      const res = await setReceptionistActiveAction(id, active);
      if (res.ok) toast.success(res.message);
      else if (res.message) toast.error(res.message);
    });
  };

  const columns = useMemo<ColumnDef<Receptionist>[]>(() => {
    const cols: ColumnDef<Receptionist>[] = [
      {
        accessorKey: "fullName",
        header: "Receptionist",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(row.original.fullName)}</AvatarFallback>
            </Avatar>
            <div className="font-medium">{row.original.fullName}</div>
          </div>
        ),
      },
      { accessorKey: "employeeCode", header: "Employee code" },
      { accessorKey: "email", header: "Email" },
      {
        id: "branch",
        header: "Branch",
        cell: ({ row }) => <span>{branchNames[row.original.branchId] ?? row.original.branchId}</span>,
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
                <DropdownMenuLabel>Receptionist</DropdownMenuLabel>
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
        <ReceptionistDialog
          receptionist={editing}
          branchOptions={branchOptions}
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      )}
      <DataTable
        columns={columns}
        data={receptionists}
        searchPlaceholder="Search receptionist…"
        emptyMessage="No receptionists found"
        toolbar={canCreate ? <ReceptionistDialog branchOptions={branchOptions} /> : undefined}
      />
    </>
  );
}
