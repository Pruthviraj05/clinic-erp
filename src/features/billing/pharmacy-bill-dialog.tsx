"use client";

import { useMemo, useState, useTransition } from "react";
import { Pill, Plus, Trash2, Loader2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MedOption {
  id: string;
  name: string;
  stock: number;
  unit: string;
  price: number;
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
}: {
  medicines: MedOption[];
  patients: PatientOption[];
  branchId: string;
}) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ medicineId: "", quantity: 1 }]);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => Object.fromEntries(medicines.map((m) => [m.id, m])), [medicines]);
  const total = lines.reduce((s, l) => s + (byId[l.medicineId]?.price ?? 0) * l.quantity, 0);

  function reset() {
    setPatientId("");
    setLines([{ medicineId: "", quantity: 1 }]);
  }

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
        reset();
      } else toast.error(res.message ?? "Could not generate bill");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger className={buttonVariants()}>
        <Pill className="size-4" /> New pharmacy bill
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New pharmacy bill</DialogTitle>
          <DialogDescription>Dispensed medicines are deducted from inventory on generate.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
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
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { medicineId: "", quantity: 1 }])}>
              <Plus className="size-4" /> Add medicine
            </Button>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-semibold">{formatCurrency(total)}</span>
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
