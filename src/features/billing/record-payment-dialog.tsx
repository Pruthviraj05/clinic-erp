"use client";

import { useActionState, useEffect, useState } from "react";
import { IndianRupee, Loader2 } from "lucide-react";
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
import { recordPaymentAction } from "@/server/actions/billing.actions";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/server/actions/appointment.actions";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Collect a full or partial payment against an outstanding invoice. */
export function RecordPaymentDialog({
  invoiceId,
  invoiceNumber,
  balance,
}: {
  invoiceId: string;
  invoiceNumber: string;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    recordPaymentAction,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Payment recorded.");
      setOpen(false);
    } else if (state.message) toast.error(state.message);
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <IndianRupee className="size-4" /> Collect payment
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Collect payment</DialogTitle>
          <DialogDescription>
            {invoiceNumber} — outstanding {formatCurrency(balance)}.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="grid gap-2">
            <Label htmlFor="pay-amount">Amount (₹)</Label>
            <input
              id="pay-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              defaultValue={String(balance)}
              className={fieldClass}
            />
            {err("amount") && <p className="text-xs text-destructive">{err("amount")}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pay-mode">Mode</Label>
            <select id="pay-mode" name="mode" className={fieldClass} defaultValue="UPI">
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
