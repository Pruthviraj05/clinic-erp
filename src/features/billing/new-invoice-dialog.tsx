"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ReceiptText, Loader2 } from "lucide-react";
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
import { createConsultationInvoiceAction } from "@/server/actions/billing.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { PatientOption } from "./pharmacy-bill-dialog";

export interface DoctorFeeOption {
  id: string;
  label: string;
  fee: number;
}
export interface BranchOption {
  id: string;
  label: string;
}

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Consultation invoice: doctor fee prefilled, discount + GST + payment mode. */
export function NewInvoiceDialog({
  patients,
  doctors,
  branches,
  defaultBranchId,
}: {
  patients: PatientOption[];
  doctors: DoctorFeeOption[];
  branches: BranchOption[];
  defaultBranchId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createConsultationInvoiceAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Invoice created.");
      setOpen(false);
      setAmount("");
      formRef.current?.reset();
    } else if (state.message) toast.error(state.message);
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>
        <ReceiptText className="size-4" /> New invoice
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New consultation invoice</DialogTitle>
          <DialogDescription>The fee prefills from the selected doctor — adjust if needed.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ci-patient">Patient</Label>
            <select id="ci-patient" name="patientId" className={fieldClass} defaultValue="">
              <option value="" disabled>Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.label}{p.sublabel ? ` · ${p.sublabel}` : ""}</option>
              ))}
            </select>
            {err("patientId") && <p className="text-xs text-destructive">{err("patientId")}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ci-doctor">Doctor</Label>
              <select
                id="ci-doctor"
                name="doctorId"
                className={fieldClass}
                defaultValue=""
                onChange={(e) => {
                  const doc = doctors.find((d) => d.id === e.target.value);
                  if (doc) setAmount(String(doc.fee));
                }}
              >
                <option value="" disabled>Select doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.label} — ₹{d.fee}</option>
                ))}
              </select>
              {err("doctorId") && <p className="text-xs text-destructive">{err("doctorId")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ci-branch">Branch</Label>
              <select id="ci-branch" name="branchId" className={fieldClass} defaultValue={defaultBranchId ?? ""}>
                <option value="" disabled>Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              {err("branchId") && <p className="text-xs text-destructive">{err("branchId")}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ci-description">Description</Label>
            <input id="ci-description" name="description" placeholder="Consultation — (auto from doctor)" className={fieldClass} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="ci-amount">Fee (₹)</Label>
              <input
                id="ci-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={fieldClass}
              />
              {err("amount") && <p className="text-xs text-destructive">{err("amount")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ci-discount">Discount (₹)</Label>
              <input id="ci-discount" name="discountAmount" type="number" step="0.01" min="0" defaultValue="0" className={fieldClass} />
              {err("discountAmount") && <p className="text-xs text-destructive">{err("discountAmount")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ci-gst">GST</Label>
              <select id="ci-gst" name="gstRate" className={fieldClass} defaultValue="0">
                <option value="0">Exempt (0%)</option>
                <option value="0.05">5%</option>
                <option value="0.12">12%</option>
                <option value="0.18">18%</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ci-payment">Payment</Label>
            <select id="ci-payment" name="payment" className={fieldClass} defaultValue="PAID_FULL">
              <option value="PAID_FULL">Collected in full</option>
              <option value="UNPAID">Bill now, collect later</option>
            </select>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Create invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
