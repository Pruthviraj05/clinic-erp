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
import { addMedicineAction } from "@/server/actions/inventory.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AddMedicineDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(addMedicineAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Medicine added.");
      setOpen(false);
      formRef.current?.reset();
    } else if (state.message) toast.error(state.message);
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="size-4" /> Add medicine
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add medicine</DialogTitle>
          <DialogDescription>Create a new inventory item with opening stock.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Medicine name</Label>
            <input id="name" name="name" className={fieldClass} placeholder="e.g. Azithromycin 500mg" />
            {err("name") && <p className="text-xs text-destructive">{err("name")}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="genericName">Generic name</Label>
              <input id="genericName" name="genericName" className={fieldClass} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand">Brand</Label>
              <input id="brand" name="brand" className={fieldClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <input id="category" name="category" className={fieldClass} placeholder="e.g. Antibiotics" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <input id="unit" name="unit" defaultValue="tablet" className={fieldClass} />
              {err("unit") && <p className="text-xs text-destructive">{err("unit")}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sellPrice">Price (₹)</Label>
              <input id="sellPrice" name="sellPrice" type="number" step="0.01" defaultValue="0" className={fieldClass} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reorderLevel">Reorder at</Label>
              <input id="reorderLevel" name="reorderLevel" type="number" defaultValue="50" className={fieldClass} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="openingStock">Opening stock</Label>
              <input id="openingStock" name="openingStock" type="number" defaultValue="0" className={fieldClass} />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Add medicine
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
