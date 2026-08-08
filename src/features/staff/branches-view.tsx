"use client";

import { useState, useTransition } from "react";
import { Building2, Phone, Mail, MapPin, Stethoscope, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { BranchDialog } from "./branch-dialog";
import { setBranchActiveAction } from "@/server/actions/staff.actions";
import type { Branch } from "@/types/domain";

export function BranchesView({
  branches,
  staffCounts,
  canCreate,
  canEdit,
  canDelete,
}: {
  branches: Branch[];
  staffCounts: Record<string, { doctors: number; receptionists: number }>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState<Branch | null>(null);
  const [pending, startTransition] = useTransition();

  const setActive = (id: string, active: boolean) => {
    startTransition(async () => {
      const res = await setBranchActiveAction(id, active);
      if (res.ok) toast.success(res.message);
      else if (res.message) toast.error(res.message);
    });
  };

  return (
    <div>
      {canCreate && (
        <div className="mb-4 flex justify-end">
          <BranchDialog />
        </div>
      )}
      {editing && (
        <BranchDialog
          branch={editing}
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((b) => {
          const counts = staffCounts[b.id] ?? { doctors: 0, receptionists: 0 };
          return (
            <div key={b.id} className={cn("rounded-xl border bg-card p-5", !b.isActive && "opacity-75")}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">Code: {b.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={b.isActive ? "ACTIVE" : "INACTIVE"} />
                  {(canEdit || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label="Branch actions"
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Branch</DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        {canEdit && (
                          <DropdownMenuItem onClick={() => setEditing(b)}>Edit</DropdownMenuItem>
                        )}
                        {b.isActive
                          ? canDelete && (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={pending}
                                onClick={() => setActive(b.id, false)}
                              >
                                Deactivate
                              </DropdownMenuItem>
                            )
                          : canEdit && (
                              <DropdownMenuItem disabled={pending} onClick={() => setActive(b.id, true)}>
                                Reactivate
                              </DropdownMenuItem>
                            )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><MapPin className="size-4" /> {b.city ?? "—"}</p>
                <p className="flex items-center gap-2"><Phone className="size-4" /> {b.phone ?? "—"}</p>
                <p className="flex items-center gap-2"><Mail className="size-4" /> {b.email ?? "—"}</p>
              </div>

              <div className="mt-4 flex items-center gap-4 border-t pt-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="size-4 text-primary" /> {counts.doctors} doctors
                </span>
                <span className="text-muted-foreground">·</span>
                <span>{counts.receptionists} receptionists</span>
              </div>
              {b.gstNumber ? (
                <p className="mt-3 text-[11px] text-muted-foreground">GSTIN: {b.gstNumber}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
