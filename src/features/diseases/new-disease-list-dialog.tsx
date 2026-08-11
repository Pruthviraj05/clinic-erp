"use client";

import { useState, useTransition } from "react";
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
import { createDiseaseGroupAction } from "@/server/actions/disease.actions";

/** Create a condition list directly from the Disease Lists page — no need to go through a consult. */
export function NewDiseaseListDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await createDiseaseGroupAction(name);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        setName("");
      } else {
        toast.error(res.message ?? "Could not create the list.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="size-4" /> New list
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New disease list</DialogTitle>
          <DialogDescription>
            Group patients by condition. Add patients here or from any consult.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="dl-name">Condition name</Label>
          <input
            id="dl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim().length >= 2) submit(); }}
            placeholder="e.g. Migraine"
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" disabled={pending || name.trim().length < 2} onClick={submit}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Create list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
