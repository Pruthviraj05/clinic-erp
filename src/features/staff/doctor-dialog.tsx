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
import { createDoctorAction, updateDoctorAction } from "@/server/actions/staff.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { Doctor } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export interface BranchOption {
  id: string;
  name: string;
}

export function DoctorDialog({
  doctor,
  branchOptions,
  open: controlledOpen,
  onOpenChange,
}: {
  doctor?: Doctor;
  branchOptions: BranchOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(doctor);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    isEdit ? updateDoctorAction : createDoctorAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? (isEdit ? "Doctor updated." : "Doctor added."));
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
          <Plus className="size-4" /> Add doctor
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit doctor" : "Add doctor"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this doctor's profile and branch assignments." : "Add a doctor and assign branches."}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          {isEdit && <input type="hidden" name="id" value={doctor!.id} />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="doctor-fullName">Full name</Label>
              <input id="doctor-fullName" name="fullName" defaultValue={doctor?.fullName} className={fieldClass} placeholder="e.g. Dr. Meera Iyer" />
              {err("fullName") && <p className="text-xs text-destructive">{err("fullName")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doctor-email">Email</Label>
              <input id="doctor-email" name="email" type="email" defaultValue={doctor?.email} className={fieldClass} />
              {err("email") && <p className="text-xs text-destructive">{err("email")}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="doctor-specialization">Specialization</Label>
              <input id="doctor-specialization" name="specialization" defaultValue={doctor?.specialization ?? ""} className={fieldClass} placeholder="e.g. Cardiology" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doctor-department">Department</Label>
              <input id="doctor-department" name="department" defaultValue={doctor?.department ?? ""} className={fieldClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="doctor-registrationNo">Registration no.</Label>
              <input id="doctor-registrationNo" name="registrationNo" defaultValue={doctor?.registrationNo ?? ""} className={fieldClass} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doctor-qualifications">Qualifications</Label>
              <input id="doctor-qualifications" name="qualifications" defaultValue={doctor?.qualifications ?? ""} className={fieldClass} placeholder="e.g. MBBS, MD" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doctor-consultationFee">Fee (₹)</Label>
              <input
                id="doctor-consultationFee"
                name="consultationFee"
                type="number"
                step="0.01"
                min="0"
                defaultValue={doctor?.consultationFee ?? 0}
                className={fieldClass}
              />
              {err("consultationFee") && <p className="text-xs text-destructive">{err("consultationFee")}</p>}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Branches</Label>
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-input p-3 sm:grid-cols-2">
              {branchOptions.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="branchIds"
                    value={b.id}
                    defaultChecked={doctor?.branchIds.includes(b.id)}
                    className="size-4 accent-primary"
                  />
                  {b.name}
                </label>
              ))}
            </div>
            {err("branchIds") && <p className="text-xs text-destructive">{err("branchIds")}</p>}
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} {isEdit ? "Save changes" : "Add doctor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
