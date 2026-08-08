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
import { createBranchAction, updateBranchAction } from "@/server/actions/staff.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { Branch } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function BranchDialog({
  branch,
  open: controlledOpen,
  onOpenChange,
}: {
  branch?: Branch;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(branch);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    isEdit ? updateBranchAction : createBranchAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? (isEdit ? "Branch updated." : "Branch created."));
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
          <Plus className="size-4" /> Add branch
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit branch" : "Add branch"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this branch's details." : "Create a new clinic branch."}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          {isEdit && <input type="hidden" name="id" value={branch!.id} />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="branch-name">Branch name</Label>
              <input id="branch-name" name="name" defaultValue={branch?.name} className={fieldClass} placeholder="e.g. Clinicore Andheri" />
              {err("name") && <p className="text-xs text-destructive">{err("name")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branch-code">Code</Label>
              <input id="branch-code" name="code" defaultValue={branch?.code} className={fieldClass} placeholder="e.g. AND" />
              {err("code") && <p className="text-xs text-destructive">{err("code")}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="branch-city">City</Label>
              <input id="branch-city" name="city" defaultValue={branch?.city ?? ""} className={fieldClass} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branch-phone">Phone</Label>
              <input id="branch-phone" name="phone" defaultValue={branch?.phone ?? ""} className={fieldClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="branch-email">Email</Label>
              <input id="branch-email" name="email" type="email" defaultValue={branch?.email ?? ""} className={fieldClass} />
              {err("email") && <p className="text-xs text-destructive">{err("email")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branch-gst">GST number</Label>
              <input id="branch-gst" name="gstNumber" defaultValue={branch?.gstNumber ?? ""} className={fieldClass} />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} {isEdit ? "Save changes" : "Add branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
