"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createReceptionistAction, updateReceptionistAction } from "@/server/actions/staff.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { Receptionist } from "@/types/domain";
import type { BranchOption } from "./doctor-dialog";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ReceptionistDialog({
  receptionist,
  branchOptions,
  open: controlledOpen,
  onOpenChange,
}: {
  receptionist?: Receptionist;
  branchOptions: BranchOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(receptionist);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    isEdit ? updateReceptionistAction : createReceptionistAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? (isEdit ? "Receptionist updated." : "Receptionist added."));
      setOpen(false);
      if (!isEdit) formRef.current?.reset();
    } else if (state.message) toast.error(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger className={buttonVariants()}>
          <Plus className="size-4" /> Add receptionist
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit receptionist" : "Add receptionist"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this receptionist's details." : "Add a front-desk staff member."}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          {isEdit && <input type="hidden" name="id" value={receptionist!.id} />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="receptionist-fullName">Full name</Label>
              <input id="receptionist-fullName" name="fullName" defaultValue={receptionist?.fullName} className={fieldClass} />
              {err("fullName") && <p className="text-xs text-destructive">{err("fullName")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receptionist-email">Email</Label>
              <input id="receptionist-email" name="email" type="email" defaultValue={receptionist?.email} className={fieldClass} />
              {err("email") && <p className="text-xs text-destructive">{err("email")}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="receptionist-branchId">Branch</Label>
              <select
                id="receptionist-branchId"
                name="branchId"
                defaultValue={receptionist?.branchId ?? ""}
                className={fieldClass}
              >
                <option value="" disabled>
                  Select branch…
                </option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {err("branchId") && <p className="text-xs text-destructive">{err("branchId")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receptionist-employeeCode">Employee code</Label>
              <input id="receptionist-employeeCode" name="employeeCode" defaultValue={receptionist?.employeeCode ?? ""} className={fieldClass} placeholder="e.g. EMP-104" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} {isEdit ? "Save changes" : "Add receptionist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
