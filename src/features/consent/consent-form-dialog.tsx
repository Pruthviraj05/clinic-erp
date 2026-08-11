"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FilePlus2, Loader2, FileText, FolderHeart, History } from "lucide-react";
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
import { createConsentAction, updateConsentAction } from "@/server/actions/consent.actions";
import { formatDate } from "@/lib/format";
import { CONSENT_CATEGORIES, CONSENT_CATEGORY_LABELS, CONSENT_TEMPLATES } from "@/lib/consent-categories";
import type { ActionResult } from "@/server/actions/appointment.actions";
import type { ConsentCategory, ConsentFormItem } from "@/server/demo/extra";
import type { PatientHistoryEntry } from "./consent-view";

export interface ConsentRefOption {
  id: string;
  label: string;
  sublabel?: string;
}

const fieldClass =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const checkClass = "size-4 rounded border-input accent-current";

/**
 * Create or edit a consent form. Reception fills the patient's basic details
 * and assigns the doctor; the assigned doctor can edit it — including
 * confirming the declaration checklist — until the patient signs.
 */
export function ConsentFormDialog({
  patients,
  doctors,
  form,
  history,
  open,
  onOpenChange,
}: {
  patients?: ConsentRefOption[];
  doctors: ConsentRefOption[];
  /** Present = edit mode (patient is fixed). */
  form?: ConsentFormItem;
  /** The patient's previous prescriptions + records, shown for context while editing. */
  history?: PatientHistoryEntry;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = !!form;
  const [selfOpen, setSelfOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : selfOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setSelfOpen;

  const [category, setCategory] = useState<ConsentCategory>(form?.category ?? "PROCEDURE");
  const [title, setTitle] = useState(form?.title ?? CONSENT_TEMPLATES[form?.category ?? "PROCEDURE"].title);
  const [body, setBody] = useState(form?.body ?? CONSENT_TEMPLATES[form?.category ?? "PROCEDURE"].body);
  const [showWitness, setShowWitness] = useState(!!form?.witnessName);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    isEdit ? updateConsentAction : createConsentAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved.");
      setOpen(false);
      if (!isEdit) {
        formRef.current?.reset();
        setCategory("PROCEDURE");
        setTitle(CONSENT_TEMPLATES.PROCEDURE.title);
        setBody(CONSENT_TEMPLATES.PROCEDURE.body);
        setShowWitness(false);
      }
    } else if (state.message) toast.error(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const err = (f: string) => state?.fieldErrors?.[f]?.[0];

  function applyCategory(next: ConsentCategory) {
    setCategory(next);
    // Only overwrite the free-text fields when they still match a template —
    // once the user has typed their own wording, switching category shouldn't erase it.
    const stillTemplate = !isEdit && Object.values(CONSENT_TEMPLATES).some((t) => t.title === title && t.body === body);
    if (!isEdit || stillTemplate) {
      setTitle(CONSENT_TEMPLATES[next].title);
      setBody(CONSENT_TEMPLATES[next].body);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger className={buttonVariants()}>
          <FilePlus2 className="size-4" /> New consent form
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit consent form" : "New consent form"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `${form?.patientName} — editable until the patient signs.`
              : "Fill the details and assign the doctor this consent concerns."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && history && (history.prescriptions.length > 0 || history.records.length > 0) && (
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <History className="size-3.5" /> Previous prescriptions
              </p>
              {history.prescriptions.length ? (
                <ul className="max-h-32 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
                  {history.prescriptions.map((rx) => (
                    <li key={rx.id} className="flex items-start gap-1.5 text-xs">
                      <FileText className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{rx.diagnoses.join(", ") || "No diagnosis"}</span>
                        <span className="text-muted-foreground"> · {formatDate(rx.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">None yet.</p>
              )}
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FolderHeart className="size-3.5" /> Medical records
              </p>
              {history.records.length ? (
                <ul className="max-h-32 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
                  {history.records.map((r) => (
                    <li key={r.id} className="flex items-start gap-1.5 text-xs">
                      <FolderHeart className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                      <span>
                        <span className="font-medium">{r.title}</span>
                        <span className="text-muted-foreground"> · {r.category} · {formatDate(r.recordedAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">None yet.</p>
              )}
            </div>
          </div>
        )}

        <form ref={formRef} action={formAction} className="grid gap-4">
          {isEdit ? (
            <input type="hidden" name="id" value={form!.id} />
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="cf-patient">Patient</Label>
              <select id="cf-patient" name="patientId" className={fieldClass} defaultValue="">
                <option value="" disabled>Select patient…</option>
                {(patients ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.label}{p.sublabel ? ` · ${p.sublabel}` : ""}</option>
                ))}
              </select>
              {err("patientId") && <p className="text-xs text-destructive">{err("patientId")}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cf-doctor">Assign doctor</Label>
              <select id="cf-doctor" name="doctorId" className={fieldClass} defaultValue={form?.doctorId ?? ""}>
                <option value="" disabled>Select doctor…</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}{d.sublabel ? ` · ${d.sublabel}` : ""}</option>
                ))}
              </select>
              {err("doctorId") && <p className="text-xs text-destructive">{err("doctorId")}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cf-category">Category</Label>
              <select
                id="cf-category"
                name="category"
                className={fieldClass}
                value={category}
                onChange={(e) => applyCategory(e.target.value as ConsentCategory)}
              >
                {CONSENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CONSENT_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cf-title">Title</Label>
            <input
              id="cf-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Consent for…"
              className={fieldClass}
            />
            {err("title") && <p className="text-xs text-destructive">{err("title")}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cf-body">Consent text</Label>
            <textarea
              id="cf-body"
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className={fieldClass}
            />
            {err("body") && <p className="text-xs text-destructive">{err("body")}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cf-details">Basic info / clinical notes</Label>
            <textarea
              id="cf-details"
              name="details"
              defaultValue={form?.details ?? ""}
              rows={3}
              placeholder="Procedure planned, relevant history, allergies, attendant name…"
              className={fieldClass}
            />
          </div>

          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Declaration checklist — confirm before the patient signs
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="risksExplained" defaultChecked={form?.risksExplained} className={checkClass} />
                Risks explained
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="alternativesDiscussed" defaultChecked={form?.alternativesDiscussed} className={checkClass} />
                Alternatives discussed
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="questionsAnswered" defaultChecked={form?.questionsAnswered} className={checkClass} />
                Questions answered
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="interpreterUsed" defaultChecked={form?.interpreterUsed} className={checkClass} />
                Interpreter used
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            {showWitness ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cf-witness-name">Witness name</Label>
                  <input id="cf-witness-name" name="witnessName" defaultValue={form?.witnessName ?? ""} className={fieldClass} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cf-witness-relation">Relation</Label>
                  <input
                    id="cf-witness-relation"
                    name="witnessRelation"
                    defaultValue={form?.witnessRelation ?? ""}
                    placeholder="Attendant, relative, staff…"
                    className={fieldClass}
                  />
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setShowWitness(true)}>
                + Add a witness
              </Button>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create consent form"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
