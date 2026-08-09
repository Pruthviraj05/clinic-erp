"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FilePlus2, Loader2, Upload } from "lucide-react";
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
import { createMedicalRecordAction } from "@/server/actions/emr.actions";
import type { ActionResult } from "@/server/actions/appointment.actions";

const fieldClass =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const CATEGORY_OPTIONS = [
  "Lab Report",
  "Imaging / Scan",
  "Prescription (external)",
  "Discharge Summary",
  "Vaccination Record",
  "Other",
];

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Add a medical record for a patient — used by the patient portal (self
 * upload) and by doctors (from a patient's file or the consent screen).
 * Files are stored as a base64 data URL on the record itself; there's no
 * object-storage backend, so this mirrors the existing consent-signature
 * pattern rather than introducing a new subsystem.
 */
export function AddMedicalRecordDialog({
  patientId,
  triggerLabel = "Add record",
  open,
  onOpenChange,
}: {
  patientId: string;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [selfOpen, setSelfOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : selfOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setSelfOpen;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createMedicalRecordAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [fileMeta, setFileMeta] = useState<{ dataUrl: string; type: string; size: string } | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Record added.");
      setOpen(false);
      formRef.current?.reset();
      setFileMeta(null);
      setFileName("");
    } else if (state.message) toast.error(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setFileMeta(null);
      setFileName("");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File is too large (max 5 MB).");
      e.target.value = "";
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFileMeta({
        dataUrl: String(reader.result),
        type: file.type.split("/")[1]?.toUpperCase() || "FILE",
        size: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      });
    };
    reader.readAsDataURL(file);
  }

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  return (
    <Dialog open={dialogOpen} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger className={buttonVariants()}>
          <FilePlus2 className="size-4" /> {triggerLabel}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add medical record</DialogTitle>
          <DialogDescription>Lab reports, scans or other documents for this patient&apos;s history.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="fileDataUrl" value={fileMeta?.dataUrl ?? ""} />
          <input type="hidden" name="fileType" value={fileMeta?.type ?? ""} />
          <input type="hidden" name="fileSize" value={fileMeta?.size ?? ""} />

          <div className="grid gap-2">
            <Label htmlFor="mr-title">Title</Label>
            <input id="mr-title" name="title" className={fieldClass} placeholder="e.g. CBC Blood Report" />
            {err("title") && <p className="text-xs text-destructive">{err("title")}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mr-category">Category</Label>
            <input
              id="mr-category"
              name="category"
              list="mr-category-options"
              className={fieldClass}
              placeholder="e.g. Lab Report"
            />
            <datalist id="mr-category-options">
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {err("category") && <p className="text-xs text-destructive">{err("category")}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mr-notes">Notes (optional)</Label>
            <textarea id="mr-notes" name="notes" rows={3} className={fieldClass} placeholder="Any context worth noting" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mr-file">Attach file (optional, max 5 MB)</Label>
            <input id="mr-file" type="file" accept="image/*,.pdf" onChange={onFileChange} className="text-sm" />
            {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Add record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
