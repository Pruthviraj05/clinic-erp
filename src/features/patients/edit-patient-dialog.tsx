"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updatePatientAction } from "@/server/actions/patient.actions";
import { bloodGroups, genders } from "./constants";
import type { ActionResult } from "@/server/actions/appointment.actions";
import { humanizeEnum } from "@/lib/format";
import type { Patient } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Edit mode of the register dialog — controlled open state, prefilled fields. */
export function EditPatientDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updatePatientAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Patient updated.");
      onOpenChange(false);
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit patient</DialogTitle>
          <DialogDescription>
            Update demographics and medical background for {patient.mrn}.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={patient.id} />
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-firstName">First name</Label>
              <input id="edit-firstName" name="firstName" defaultValue={patient.firstName} className={fieldClass} />
              {err("firstName") && <p className="text-xs text-destructive">{err("firstName")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-lastName">Last name</Label>
              <input id="edit-lastName" name="lastName" defaultValue={patient.lastName ?? ""} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-gender">Gender</Label>
              <select id="edit-gender" name="gender" className={fieldClass} defaultValue={patient.gender}>
                {genders.map((g) => <option key={g} value={g}>{humanizeEnum(g)}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-dateOfBirth">Date of birth</Label>
              <input
                id="edit-dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={patient.dateOfBirth ?? ""}
                className={fieldClass}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-bloodGroup">Blood group</Label>
              <select id="edit-bloodGroup" name="bloodGroup" className={fieldClass} defaultValue={patient.bloodGroup}>
                {bloodGroups.map((b) => <option key={b} value={b}>{b.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <input id="edit-phone" name="phone" defaultValue={patient.phone} className={fieldClass} placeholder="+91…" />
              {err("phone") && <p className="text-xs text-destructive">{err("phone")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <input id="edit-email" name="email" type="email" defaultValue={patient.email ?? ""} className={fieldClass} />
              {err("email") && <p className="text-xs text-destructive">{err("email")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-city">City</Label>
              <input id="edit-city" name="city" defaultValue={patient.city ?? ""} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-allergies">Allergies</Label>
              <input
                id="edit-allergies"
                name="allergies"
                defaultValue={patient.allergies ?? ""}
                className={fieldClass}
                placeholder="e.g. Penicillin"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-chronicDiseases">Chronic conditions</Label>
              <input
                id="edit-chronicDiseases"
                name="chronicDiseases"
                defaultValue={patient.chronicDiseases ?? ""}
                className={fieldClass}
                placeholder="e.g. Diabetes"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
