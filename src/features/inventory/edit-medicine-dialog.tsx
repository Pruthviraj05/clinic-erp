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
import { updateMedicineAction } from "@/server/actions/inventory.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { Medicine } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function EditMedicineDialog({
  medicine,
  open,
  onOpenChange,
}: {
  medicine: Medicine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(updateMedicineAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Medicine updated.");
      onOpenChange(false);
      formRef.current?.reset();
    } else if (state.message) toast.error(state.message);
  }, [state, onOpenChange]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit medicine</DialogTitle>
          <DialogDescription>
            Update item details. Stock quantity changes go through Adjust stock.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={medicine.id} />
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Medicine name</Label>
            <input id="edit-name" name="name" defaultValue={medicine.name} className={fieldClass} />
            {err("name") && <p className="text-xs text-destructive">{err("name")}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-genericName">Generic name</Label>
              <input id="edit-genericName" name="genericName" defaultValue={medicine.genericName ?? ""} className={fieldClass} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-brand">Brand</Label>
              <input id="edit-brand" name="brand" defaultValue={medicine.brand ?? ""} className={fieldClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <input id="edit-category" name="category" defaultValue={medicine.category ?? ""} className={fieldClass} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-unit">Unit</Label>
              <input id="edit-unit" name="unit" defaultValue={medicine.unit} className={fieldClass} />
              {err("unit") && <p className="text-xs text-destructive">{err("unit")}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-sellPrice">Price (₹)</Label>
              <input id="edit-sellPrice" name="sellPrice" type="number" step="0.01" defaultValue={medicine.sellPrice} className={fieldClass} />
              {err("sellPrice") && <p className="text-xs text-destructive">{err("sellPrice")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-reorderLevel">Reorder at</Label>
              <input id="edit-reorderLevel" name="reorderLevel" type="number" defaultValue={medicine.reorderLevel} className={fieldClass} />
              {err("reorderLevel") && <p className="text-xs text-destructive">{err("reorderLevel")}</p>}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
