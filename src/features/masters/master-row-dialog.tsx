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
import { saveMasterRowAction } from "@/server/actions/masters.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { MasterRow } from "./masters-view";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function MasterRowDialog({
  group,
  groupLabel,
  row,
  open,
  onOpenChange,
}: {
  group: string;
  groupLabel: string;
  row: MasterRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(saveMasterRowAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved.");
      onOpenChange(false);
      formRef.current?.reset();
    } else if (state.message) toast.error(state.message);
  }, [state, onOpenChange]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];
  const editing = Boolean(row);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${groupLabel}` : `Add ${groupLabel}`}</DialogTitle>
          <DialogDescription>
            {editing ? "Update this entry. Changes apply everywhere it is used." : `Create a new entry under ${groupLabel}.`}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          <input type="hidden" name="group" value={group} />
          {row && <input type="hidden" name="id" value={row.id} />}
          <div className="grid gap-2">
            <Label htmlFor="master-name">Name</Label>
            <input
              id="master-name"
              name="name"
              defaultValue={row?.name}
              className={fieldClass}
              placeholder="e.g. Cardiology"
            />
            {err("name") && <p className="text-xs text-destructive">{err("name")}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="master-meta">Details (optional)</Label>
            <input
              id="master-meta"
              name="meta"
              defaultValue={row?.meta}
              className={fieldClass}
              placeholder="e.g. price, code or note"
            />
            {err("meta") && <p className="text-xs text-destructive">{err("meta")}</p>}
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} {editing ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
