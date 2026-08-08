"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, PackagePlus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adjustStockAction } from "@/server/actions/inventory.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { Medicine } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdjustStockDialog({ medicine }: { medicine: Medicine }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(adjustStockAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Stock updated.");
      setOpen(false);
    } else if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10">
        <PackagePlus className="mr-1 inline size-4 align-text-bottom" /> Adjust
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock — {medicine.name}</DialogTitle>
          <DialogDescription>
            Current balance: <span className="font-medium text-foreground">{medicine.stockQty} {medicine.unit}</span>
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="medicineId" value={medicine.id} />
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="direction">Movement</Label>
              <select id="direction" name="direction" className={fieldClass} defaultValue="IN">
                <option value="IN">Stock in (+)</option>
                <option value="OUT">Stock out (−)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <input id="quantity" name="quantity" type="number" min="1" defaultValue="1" className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason</Label>
            <input id="reason" name="reason" className={fieldClass} placeholder="e.g. Purchase, damage, correction" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Update stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
