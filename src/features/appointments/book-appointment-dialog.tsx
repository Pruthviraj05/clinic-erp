"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
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
import { createAppointmentAction, type ActionResult } from "@/server/actions/appointment.actions";
import { appointmentTypes, bookingSources, bookingSourceLabels } from "./constants";
import { humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface RefOption {
  id: string;
  label: string;
  sublabel?: string;
}

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookAppointmentDialog({
  branches,
  doctors,
  patients,
  defaultBranchId,
  defaultDate,
  triggerLabel = "Book appointment",
  fixedPatient,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: {
  branches: RefOption[];
  doctors: RefOption[];
  patients: RefOption[];
  defaultBranchId?: string;
  /** Pre-fill the date field, e.g. YYYY-MM-DD from a clicked calendar day. */
  defaultDate?: string;
  triggerLabel?: string;
  /** Pin the patient (patient portal self-booking) — hides the patient select. */
  fixedPatient?: RefOption;
  /** Open on mount (e.g. arriving via “Book appointment” deep link). */
  defaultOpen?: boolean;
  /** Controlled mode (e.g. opened from a calendar day click) — omit both to use the built-in trigger. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isControlled = openProp !== undefined;
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const open = isControlled ? openProp : selfOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setSelfOpen;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createAppointmentAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Appointment booked.");
      setOpen(false);
      formRef.current?.reset();
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger className={buttonVariants({ size: "lg", className: "h-9 shrink-0" })}>
          <CalendarPlus className="size-4" /> {triggerLabel}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book appointment</DialogTitle>
          <DialogDescription>Schedule a consultation for a patient.</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="patientId">Patient</Label>
            {fixedPatient ? (
              <>
                <input type="hidden" name="patientId" value={fixedPatient.id} />
                <div className={cn(fieldClass, "flex items-center bg-muted/40 text-muted-foreground")}>
                  {fixedPatient.label}{fixedPatient.sublabel ? ` · ${fixedPatient.sublabel}` : ""}
                </div>
              </>
            ) : (
              <select id="patientId" name="patientId" className={fieldClass} defaultValue="">
                <option value="" disabled>Select patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}{p.sublabel ? ` · ${p.sublabel}` : ""}
                  </option>
                ))}
              </select>
            )}
            {err("patientId") && <p className="text-xs text-destructive">{err("patientId")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="doctorId">Doctor</Label>
              <select id="doctorId" name="doctorId" className={fieldClass} defaultValue="">
                <option value="" disabled>Select doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              {err("doctorId") && <p className="text-xs text-destructive">{err("doctorId")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branchId">Branch</Label>
              <select id="branchId" name="branchId" className={fieldClass} defaultValue={defaultBranchId ?? ""}>
                <option value="" disabled>Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              {err("branchId") && <p className="text-xs text-destructive">{err("branchId")}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <input id="date" name="date" type="date" defaultValue={defaultDate ?? todayStr()} className={fieldClass} />
              {err("date") && <p className="text-xs text-destructive">{err("date")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Time</Label>
              <input id="time" name="time" type="time" defaultValue="10:00" className={fieldClass} />
              {err("time") && <p className="text-xs text-destructive">{err("time")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="durationMinutes">Duration</Label>
              <select id="durationMinutes" name="durationMinutes" className={fieldClass} defaultValue="15">
                {[10, 15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className={fieldClass} defaultValue="SCHEDULED">
                {appointmentTypes.map((t) => (
                  <option key={t} value={t}>{humanizeEnum(t)}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <input id="reason" name="reason" placeholder="e.g. Follow-up" className={fieldClass} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="source">How was this booked?</Label>
            {fixedPatient ? (
              // Portal self-booking is always the website — no reason to ask.
              <input type="hidden" name="source" value="WEBSITE" />
            ) : (
              <select id="source" name="source" className={fieldClass} defaultValue="WALK_IN">
                {bookingSources.map((s) => (
                  <option key={s} value={s}>{bookingSourceLabels[s]}</option>
                ))}
              </select>
            )}
          </div>

          <DialogFooter className={cn("mt-2")}>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Book appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
