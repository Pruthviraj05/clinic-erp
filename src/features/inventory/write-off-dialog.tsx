"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, PackageX } from "lucide-react";
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
import { writeOffBatchAction } from "@/server/actions/inventory.actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { MedicineBatch } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const REASONS = [
  "Expired — destroyed",
  "Expired — returned to supplier",
  "Damaged in storage",
  "Recalled by manufacturer",
  "Stock count correction",
];

/**
 * Writing stock off destroys value and cannot be undone from the UI, so it
 * asks for an explicit reason and shows the loss before confirming.
 */
export function WriteOffDialog({
  batch,
  onClose,
}: {
  batch: MedicineBatch | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (batch) setReason(REASONS[0]);
  }, [batch]);

  function confirm() {
    if (!batch) return;
    startTransition(async () => {
      const res = await writeOffBatchAction(batch.id, reason);
      if (res.ok) {
        toast.success(res.message);
        onClose();
      } else {
        toast.error(res.message ?? "Could not write this batch off.");
      }
    });
  }

  const loss = batch ? batch.quantity * batch.costPrice : 0;

  return (
    <Dialog open={!!batch} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write off stock</DialogTitle>
          <DialogDescription>
            Removes the remaining units from stock and records the loss. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {batch && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{batch.medicineName}</p>
              <p className="text-xs text-muted-foreground">
                Batch {batch.batchNo}
                {batch.expiry && <> · expires {formatDate(batch.expiry)}</>}
              </p>
              <p className="mt-2">
                <span className="font-semibold">{batch.quantity}</span> unit(s) will be removed ·{" "}
                loss at cost <span className="font-semibold text-destructive">{formatCurrency(loss)}</span>
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wo-reason">Reason</Label>
              <select
                id="wo-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={fieldClass}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Recorded against the batch in the stock ledger.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <PackageX className="size-4" />}
            Write off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
