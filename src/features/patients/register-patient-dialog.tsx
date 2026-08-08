"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
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
import { createPatientAction } from "@/server/actions/patient.actions";
import { bloodGroups, genders } from "./constants";
import type { ActionResult } from "@/server/actions/appointment.actions";
import { humanizeEnum } from "@/lib/format";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RegisterPatientDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createPatientAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Patient registered.");
      setOpen(false);
      formRef.current?.reset();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <UserPlus className="size-4" /> Register patient
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register new patient</DialogTitle>
          <DialogDescription>Capture demographics and medical background.</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First name</Label>
              <input id="firstName" name="firstName" className={fieldClass} />
              {err("firstName") && <p className="text-xs text-destructive">{err("firstName")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <input id="lastName" name="lastName" className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" name="gender" className={fieldClass} defaultValue="UNDISCLOSED">
                {genders.map((g) => <option key={g} value={g}>{humanizeEnum(g)}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <input id="dateOfBirth" name="dateOfBirth" type="date" className={fieldClass} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bloodGroup">Blood group</Label>
              <select id="bloodGroup" name="bloodGroup" className={fieldClass} defaultValue="UNKNOWN">
                {bloodGroups.map((b) => <option key={b} value={b}>{b.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <input id="phone" name="phone" className={fieldClass} placeholder="+91…" />
              {err("phone") && <p className="text-xs text-destructive">{err("phone")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <input id="email" name="email" type="email" className={fieldClass} />
              {err("email") && <p className="text-xs text-destructive">{err("email")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <input id="city" name="city" className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="allergies">Allergies</Label>
              <input id="allergies" name="allergies" className={fieldClass} placeholder="e.g. Penicillin" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="chronicDiseases">Chronic conditions</Label>
              <input id="chronicDiseases" name="chronicDiseases" className={fieldClass} placeholder="e.g. Diabetes" />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Register patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
