"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pill, Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
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
import { createPharmacyBillAction } from "@/server/actions/billing.actions";
import { PHARMACY_GST_RATE } from "@/lib/billing-rates";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MedOption {
  id: string;
  name: string;
  stock: number;
  unit: string;
  price: number;
  /** The lot FEFO will draw from first — shown so it can be checked against the shelf. */
  nextBatchNo?: string | null;
  nextExpiry?: string | null;
  gstRate?: number;
}
export interface PatientOption {
  id: string;
  label: string;
  sublabel?: string;
}

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface Line {
  medicineId: string;
  quantity: number;
}

export function PharmacyBillDialog({
  medicines,
  patients,
  branchId,
  initialPatientId,
  initialLines,
  unmatchedNames,
  autoOpen = false,
}: {
  medicines: MedOption[];
  patients: PatientOption[];
  branchId: string;
  /** Prefill from a just-issued prescription — reception still reviews/edits before generating. */
  initialPatientId?: string;
  initialLines?: Line[];
  /** Prescribed medicine names that had no catalog match — shown as a heads-up. */
  unmatchedNames?: string[];
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [lines, setLines] = useState<Line[]>(
    initialLines && initialLines.length ? initialLines : [{ medicineId: "", quantity: 1 }],
  );
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => Object.fromEntries(medicines.map((m) => [m.id, m])), [medicines]);
  const subtotal = lines.reduce((s, l) => s + (byId[l.medicineId]?.price ?? 0) * l.quantity, 0);
  // Per-item GST, matching the server exactly — pharma spans 5/12/18%.
  const taxAmount =
    Math.round(
      lines.reduce((s, l) => {
        const med = byId[l.medicineId];
        if (!med) return s;
        return s + med.price * l.quantity * (med.gstRate ?? PHARMACY_GST_RATE);
      }, 0) * 100,
    ) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Only name a rate when every line shares one; a mixed bill would otherwise
  // print a percentage that does not match the tax actually charged.
  const gstLabel = useMemo(() => {
    const rates = new Set(
      lines
        .map((l) => byId[l.medicineId])
        .filter(Boolean)
        .map((m) => m.gstRate ?? PHARMACY_GST_RATE),
    );
    if (rates.size === 1) return ` (${Math.round([...rates][0] * 100)}%)`;
    return rates.size > 1 ? " (mixed rates)" : "";
  }, [lines, byId]);

  /**
   * `afterBill` clears rather than restoring the prescription prefill: after a
   * bill is generated, reopening the dialog must NOT come back preloaded with
   * the medicines just dispensed, or one more click double-deducts stock and
   * double-charges the patient.
   */
  function reset(afterBill = false) {
    setPatientId(afterBill ? "" : initialPatientId ?? "");
    const restore = afterBill ? undefined : initialLines;
    setLines(restore && restore.length ? restore : [{ medicineId: "", quantity: 1 }]);
  }

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  function submit() {
    const items = lines.filter((l) => l.medicineId && l.quantity > 0);
    if (!patientId) return toast.error("Select a patient.");
    if (!items.length) return toast.error("Add at least one medicine.");
    // Client-side stock guard for immediate feedback.
    for (const l of items) {
      const m = byId[l.medicineId];
      if (m && l.quantity > m.stock) return toast.error(`Only ${m.stock} ${m.unit} of ${m.name} in stock.`);
    }
    startTransition(async () => {
      const res = await createPharmacyBillAction({ patientId, branchId, items });
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        reset(true); // dispensed — do not restore the prefill
      } else toast.error(res.message ?? "Could not generate bill");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(false); }}>
      <DialogTrigger className={buttonVariants()}>
        <Pill className="size-4" /> New pharmacy bill
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New pharmacy bill</DialogTitle>
          <DialogDescription>Dispensed medicines are deducted from inventory on generate.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {unmatchedNames && unmatchedNames.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-2.5 text-xs text-[var(--warning)]">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                No catalog match for: {unmatchedNames.join(", ")}. Add them manually below with the right price.
              </span>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Patient</Label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={fieldClass}>
              <option value="">Select patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.label}{p.sublabel ? ` · ${p.sublabel}` : ""}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Medicines</Label>
            {lines.map((line, i) => {
              const med = byId[line.medicineId];
              return (
                <div key={i} className="flex flex-wrap items-start gap-2">
                  <select
                    value={line.medicineId}
                    onChange={(e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, medicineId: e.target.value } : l)))}
                    className={cn(fieldClass, "w-full min-w-0 sm:w-auto sm:flex-1")}
                  >
                    <option value="">Select medicine…</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id} disabled={m.stock <= 0}>
                        {m.name} — {m.stock} {m.unit} @ {formatCurrency(m.price)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, quantity: Math.max(1, Number(e.target.value)) } : l)))}
                    className={cn(fieldClass, "w-20")}
                    aria-label="Quantity"
                  />
                  <div className="w-24 pt-2 text-right text-sm font-medium">
                    {formatCurrency((med?.price ?? 0) * line.quantity)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove line"
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  {/* Which physical box to take off the shelf. Stock goes out
                      first-expiry-first, so this is the lot that will move. */}
                  {med?.nextBatchNo && (
                    <p className="w-full text-xs text-muted-foreground">
                      Dispensing batch <span className="font-medium text-foreground">{med.nextBatchNo}</span>
                      {med.nextExpiry && <> · expires {formatDate(med.nextExpiry)}</>}
                    </p>
                  )}
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { medicineId: "", quantity: 1 }])}>
              <Plus className="size-4" /> Add medicine
            </Button>
          </div>

          {/* Must mirror the server's arithmetic exactly — the counter reads
              this number out loud and collects it. */}
          <div className="space-y-1 border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">GST{gstLabel}</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium">Total payable</span>
              <span className="text-lg font-semibold">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />} Generate bill & dispense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
