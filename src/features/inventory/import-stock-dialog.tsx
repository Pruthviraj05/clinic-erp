"use client";

import { useRef, useState, useTransition } from "react";
import {
  Upload,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  PackagePlus,
  RotateCcw,
  CheckCircle2,
  Download,
} from "lucide-react";
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
import { importStockAction } from "@/server/actions/inventory.actions";
import { parseImportRows, importableRows, type ParsedImportRow } from "./import-parse";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Medicine } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const MAX_BILL_BYTES = 5 * 1024 * 1024;
const MAX_SHEET_BYTES = 5 * 1024 * 1024;

/**
 * Bulk stock-in from a CSV/Excel file, with the supplier's bill photo
 * optionally attached to every movement it creates.
 *
 * Deliberately two-step: the file is parsed in the browser and shown as a
 * preview (what will be created vs restocked, and which rows are rejected and
 * why) and nothing is written until the user confirms. Stock corrections are
 * painful to unpick, so a blind import is not offered.
 */
export function ImportStockDialog({ medicines }: { medicines: Medicine[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [reference, setReference] = useState("");
  const [billPhoto, setBillPhoto] = useState("");
  const [billName, setBillName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [pending, startTransition] = useTransition();
  const sheetInputRef = useRef<HTMLInputElement>(null);

  const good = rows ? importableRows(rows) : [];
  const bad = rows ? rows.filter((r) => r.error) : [];
  const newCount = good.filter((r) => !r.medicineId).length;
  const restockCount = good.length - newCount;

  function reset() {
    setRows(null);
    setFileName("");
    setReference("");
    setBillPhoto("");
    setBillName("");
    if (sheetInputRef.current) sheetInputRef.current.value = "";
  }

  async function onSheetChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SHEET_BYTES) {
      toast.error("File is too large (max 5 MB).");
      e.target.value = "";
      return;
    }
    setParsing(true);
    setFileName(file.name);
    try {
      // Loaded on demand — xlsx is ~143 kB and only needed once someone imports.
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) {
        toast.error("That file has no sheets.");
        setRows(null);
        return;
      }
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const result = parseImportRows(records, medicines);
      if (result.fatal) {
        toast.error(result.fatal);
        setRows(null);
        return;
      }
      setRows(result.rows);
    } catch {
      toast.error("Could not read that file. Use a .csv or .xlsx export.");
      setRows(null);
    } finally {
      setParsing(false);
    }
  }

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

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet([
      { Medicine: "Etoricoxib 90mg", Quantity: 100, Unit: "Tablet", Category: "NSAID", "Reorder Level": 20, Price: 12 },
      { Medicine: "New Medicine Example", Quantity: 50, Unit: "Tablet", Category: "Analgesic", "Reorder Level": 15, Price: 9 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, "stock-import-template.xlsx");
  }

  function confirm() {
    if (!good.length) return;
    startTransition(async () => {
      const res = await importStockAction({
        rows: good.map((r) => ({
          medicineId: r.medicineId,
          name: r.name,
          quantity: r.quantity,
          genericName: r.genericName,
          category: r.category,
          brand: r.brand,
          unit: r.unit,
          reorderLevel: r.reorderLevel,
          sellPrice: r.sellPrice,
        })),
        reference: reference.trim() || fileName,
        billPhotoDataUrl: billPhoto || undefined,
      });
      if (res.ok) {
        toast.success(res.message ?? "Stock imported.");
        if (res.data?.failed.length) {
          toast.error(`${res.data.failed.length} row(s) could not be saved: ${res.data.failed.map((f) => f.name).join(", ")}`);
        }
        setOpen(false);
        reset();
      } else {
        toast.error(res.message ?? "Import failed.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "lg", className: "h-9 shrink-0" })}>
        <Upload className="size-4" /> Import stock
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import stock from a file</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file. Nothing is saved until you review and confirm below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="stock-sheet">Stock file (.csv or .xlsx, max 5 MB)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="size-3.5" /> Template
              </Button>
            </div>
            <input
              id="stock-sheet"
              ref={sheetInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onSheetChange}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Needs a medicine-name column and a quantity column. Generic, brand, category, unit, reorder level and
              price are used when present.
            </p>
          </div>

          {parsing && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Reading {fileName}…
            </p>
          )}

          {rows && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--success)]/12 px-2 py-1 font-medium text-[var(--success)]">
                  <PackagePlus className="size-3.5" /> {newCount} new
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 font-medium text-primary">
                  <RotateCcw className="size-3.5" /> {restockCount} restocked
                </span>
                {bad.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive">
                    <AlertTriangle className="size-3.5" /> {bad.length} skipped
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-auto rounded-lg border scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Medicine</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                      <th className="px-3 py-2 text-left font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r, i) => (
                      <tr key={i} className={cn(r.error && "bg-destructive/5")}>
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.quantity || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.sellPrice !== undefined ? formatCurrency(r.sellPrice) : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.error ? (
                            <span className="text-destructive">{r.error}</span>
                          ) : r.medicineId ? (
                            <span className="text-muted-foreground">
                              {r.currentStock} → <span className="font-medium text-foreground">{(r.currentStock ?? 0) + r.quantity}</span>
                            </span>
                          ) : (
                            <span className="text-[var(--success)]">New medicine</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="import-ref">Reference (optional)</Label>
                  <input
                    id="import-ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. Bill #4471, MediSupply"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="import-bill">Supplier bill photo (optional)</Label>
                  <input id="import-bill" type="file" accept="image/*,.pdf" onChange={onBillChange} className="text-sm" />
                  {billName && <p className="text-xs text-muted-foreground">Attached: {billName}</p>}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={pending || !good.length}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {good.length ? `Confirm & import ${good.length} row(s)` : "Nothing to import"}
          </Button>
        </DialogFooter>

        {!rows && !parsing && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileSpreadsheet className="size-3.5" /> Choose a file to see what will be imported.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
