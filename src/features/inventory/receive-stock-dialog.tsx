"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, PackagePlus, TruckIcon } from "lucide-react";
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
import { receiveStockAction } from "@/server/actions/inventory.actions";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { Medicine } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const MAX_BILL_BYTES = 5 * 1024 * 1024;

/**
 * Goods-received entry: one lot from a supplier bill.
 *
 * Modelled on how a pharmacy actually receives stock — batch number, expiry,
 * the price paid (PTR) and the printed MRP, plus free scheme units. That is
 * what makes expiry tracking, recalls and margin reporting possible; a plain
 * "+50 units" adjustment cannot support any of them.
 */
export function ReceiveStockDialog({
  medicines,
  suppliers = [],
}: {
  medicines: Medicine[];
  suppliers?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [freeQuantity, setFreeQuantity] = useState("0");
  const [costPrice, setCostPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [billPhoto, setBillPhoto] = useState("");
  const [billName, setBillName] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    receiveStockAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const selected = medicines.find((m) => m.id === medicineId);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Stock received.");
      setOpen(false);
      formRef.current?.reset();
      setMedicineId("");
      setQuantity("");
      setFreeQuantity("0");
      setCostPrice("");
      setMrp("");
      setBillPhoto("");
      setBillName("");
    } else if (state.message) toast.error(state.message);
  }, [state]);

  /** Live margin, so a bad purchase price is obvious before it is saved. */
  const margin = useMemo(() => {
    const cost = Number(costPrice);
    const sell = selected?.sellPrice ?? 0;
    if (!cost || !sell) return null;
    const paid = Number(quantity) || 0;
    const free = Number(freeQuantity) || 0;
    const units = paid + free;
    const effective = units > 0 ? (cost * paid) / units : cost;
    return {
      effective,
      pct: sell > 0 ? Math.round(((sell - effective) / sell) * 1000) / 10 : 0,
    };
  }, [costPrice, quantity, freeQuantity, selected]);

  function onBillChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setBillPhoto("");
      setBillName("");
      return;
    }
    if (file.size > MAX_BILL_BYTES) {
      toast.error("Bill photo is too large (max 5 MB).");
      e.target.value = "";
      return;
    }
    setBillName(file.name);
    const reader = new FileReader();
    reader.onload = () => setBillPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ size: "lg", className: "h-9 shrink-0" })}>
        <TruckIcon className="size-4" /> Receive stock
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive stock</DialogTitle>
          <DialogDescription>
            Enter one batch from the supplier&apos;s bill. Batch and expiry are what make recalls and
            expiry alerts possible.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <input type="hidden" name="billPhotoDataUrl" value={billPhoto} />

          <div className="grid gap-2">
            <Label htmlFor="rs-medicine">Medicine</Label>
            <select
              id="rs-medicine"
              name="medicineId"
              value={medicineId}
              onChange={(e) => setMedicineId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select medicine…</option>
              {medicines
                .filter((m) => m.isActive)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.stockQty} {m.unit} in stock
                  </option>
                ))}
            </select>
            {err("medicineId") && <p className="text-xs text-destructive">{err("medicineId")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="rs-batch">Batch no.</Label>
              <input id="rs-batch" name="batchNo" className={fieldClass} placeholder="e.g. AB2417" />
              {err("batchNo") && <p className="text-xs text-destructive">{err("batchNo")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rs-expiry">Expiry</Label>
              <input id="rs-expiry" name="expiry" type="month" className={fieldClass} />
              {err("expiry") && <p className="text-xs text-destructive">{err("expiry")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rs-qty">Quantity</Label>
              <input
                id="rs-qty"
                name="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={fieldClass}
              />
              {err("quantity") && <p className="text-xs text-destructive">{err("quantity")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rs-free">Free</Label>
              <input
                id="rs-free"
                name="freeQuantity"
                type="number"
                min="0"
                value={freeQuantity}
                onChange={(e) => setFreeQuantity(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rs-cost">Purchase price / unit (PTR)</Label>
              <input
                id="rs-cost"
                name="costPrice"
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className={fieldClass}
              />
              {err("costPrice") && <p className="text-xs text-destructive">{err("costPrice")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rs-mrp">MRP / unit</Label>
              <input
                id="rs-mrp"
                name="mrp"
                type="number"
                step="0.01"
                min="0"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {margin && selected && (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
              Effective cost {formatCurrency(margin.effective)}/unit against a selling price of{" "}
              {formatCurrency(selected.sellPrice)} —{" "}
              <span className={margin.pct < 0 ? "font-semibold text-destructive" : "font-semibold text-[var(--success)]"}>
                {margin.pct}% margin
              </span>
              {margin.pct < 0 && " · you would be selling at a loss"}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rs-supplier">Supplier</Label>
              <input
                id="rs-supplier"
                name="supplierName"
                list="rs-supplier-options"
                className={fieldClass}
                placeholder="Distributor name"
              />
              <datalist id="rs-supplier-options">
                {suppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rs-bill">Supplier bill no.</Label>
              <input id="rs-bill" name="purchaseBillNo" className={fieldClass} placeholder="e.g. SPD-4471" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rs-photo">Bill photo (optional, max 5 MB)</Label>
            <input id="rs-photo" type="file" accept="image/*,.pdf" onChange={onBillChange} className="text-sm" />
            {billName && <p className="text-xs text-muted-foreground">Attached: {billName}</p>}
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
              Receive
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
