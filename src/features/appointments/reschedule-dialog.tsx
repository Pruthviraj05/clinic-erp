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
import { rescheduleAppointmentAction, type ActionResult } from "@/server/actions/appointment.actions";
import type { Appointment } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function toDateStr(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeStr(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Move an existing appointment to a new slot. Controlled open state. */
export function RescheduleDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    rescheduleAppointmentAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Appointment rescheduled.");
      onOpenChange(false);
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  const currentDuration = Math.max(
    5,
    Math.round(
      (new Date(appointment.scheduledEnd).getTime() - new Date(appointment.scheduledStart).getTime()) / 60_000,
    ),
  );
  const durations = [10, 15, 20, 30, 45, 60].includes(currentDuration)
    ? [10, 15, 20, 30, 45, 60]
    : [currentDuration, 10, 15, 20, 30, 45, 60];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            {appointment.patientName} with {appointment.doctorName} — pick a new slot.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={appointment.id} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="reschedule-date">Date</Label>
              <input
                id="reschedule-date"
                name="date"
                type="date"
                defaultValue={toDateStr(appointment.scheduledStart)}
                className={fieldClass}
              />
              {err("date") && <p className="text-xs text-destructive">{err("date")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reschedule-time">Time</Label>
              <input
                id="reschedule-time"
                name="time"
                type="time"
                defaultValue={toTimeStr(appointment.scheduledStart)}
                className={fieldClass}
              />
              {err("time") && <p className="text-xs text-destructive">{err("time")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reschedule-durationMinutes">Duration</Label>
              <select
                id="reschedule-durationMinutes"
                name="durationMinutes"
                className={fieldClass}
                defaultValue={String(currentDuration)}
              >
                {durations.map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
              {err("durationMinutes") && (
                <p className="text-xs text-destructive">{err("durationMinutes")}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Reschedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
