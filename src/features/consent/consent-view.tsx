"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  FileSignature,
  Loader2,
  CheckCircle2,
  Pencil,
  Stethoscope,
  FilePlus2,
  Eye,
  XCircle,
  Stamp,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SignaturePad } from "@/components/shared/signature-pad";
import { EmptyState } from "@/components/shared/empty-state";
import { signConsentAction, doctorSignConsentAction, declineConsentAction } from "@/server/actions/consent.actions";
import { ConsentFormDialog, type ConsentRefOption } from "./consent-form-dialog";
import { AddMedicalRecordDialog } from "@/features/records/medical-record-dialog";
import { formatDate } from "@/lib/format";
import { CONSENT_CATEGORY_LABELS } from "@/lib/consent-categories";
import { cn } from "@/lib/utils";
import type { ConsentFormItem, MedicalRecordItem } from "@/server/demo/extra";
import type { Prescription } from "@/types/domain";

export interface PatientHistoryEntry {
  prescriptions: Prescription[];
  records: MedicalRecordItem[];
}

/** Small "risks · alternatives · questions" summary shown on each card. */
function ChecklistSummary({ form }: { form: ConsentFormItem }) {
  const items = [
    ["Risks", form.risksExplained],
    ["Alternatives", form.alternativesDiscussed],
    ["Questions", form.questionsAnswered],
  ] as const;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {items.map(([label, done]) => (
        <span key={label} className="inline-flex items-center gap-1">
          {done ? <CheckSquare className="size-3.5 text-[var(--success)]" /> : <Square className="size-3.5" />}
          {label}
        </span>
      ))}
    </div>
  );
}

export function ConsentView({
  forms,
  canSign = false,
  canEdit = false,
  canDoctorSign = false,
  doctors = [],
  patientHistory,
  canAddRecords = false,
  detailBasePath,
}: {
  forms: ConsentFormItem[];
  canSign?: boolean;
  /** Reception + the assigned doctor may edit an unsigned form. */
  canEdit?: boolean;
  /** The logged-in doctor may countersign forms assigned to them. */
  canDoctorSign?: boolean;
  doctors?: ConsentRefOption[];
  /** Keyed by patientId — previous prescriptions + records, shown while editing a form. */
  patientHistory?: Record<string, PatientHistoryEntry>;
  /** Doctor viewing this screen may add a medical record for the patient. */
  canAddRecords?: boolean;
  /** Role-scoped route prefix (e.g. "/reception") the "View / print" link is built from. */
  detailBasePath?: string;
}) {
  const [active, setActive] = useState<ConsentFormItem | null>(null);
  const [declining, setDeclining] = useState<ConsentFormItem | null>(null);
  const [doctorSigning, setDoctorSigning] = useState<ConsentFormItem | null>(null);
  const [editing, setEditing] = useState<ConsentFormItem | null>(null);
  const [addingRecordFor, setAddingRecordFor] = useState<ConsentFormItem | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [doctorSignature, setDoctorSignature] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!active || !signature) {
      toast.error("Please sign before submitting.");
      return;
    }
    startTransition(async () => {
      const res = await signConsentAction(active.id, signature);
      if (res.ok) {
        toast.success(res.message);
        setActive(null);
        setSignature(null);
      } else {
        toast.error(res.message ?? "Could not sign");
      }
    });
  }

  function submitDoctorSign() {
    if (!doctorSigning || !doctorSignature) {
      toast.error("Please sign before submitting.");
      return;
    }
    startTransition(async () => {
      const res = await doctorSignConsentAction(doctorSigning.id, doctorSignature);
      if (res.ok) {
        toast.success(res.message);
        setDoctorSigning(null);
        setDoctorSignature(null);
      } else {
        toast.error(res.message ?? "Could not sign");
      }
    });
  }

  function submitDecline() {
    if (!declining) return;
    if (declineReason.trim().length < 4) {
      toast.error("Give a reason for declining.");
      return;
    }
    startTransition(async () => {
      const res = await declineConsentAction(declining.id, declineReason);
      if (res.ok) {
        toast.success(res.message);
        setDeclining(null);
        setActive(null);
        setDeclineReason("");
      } else {
        toast.error(res.message ?? "Could not record the decline");
      }
    });
  }

  if (forms.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={FileSignature}
          title="No consent forms"
          description="Consent forms created at the front desk appear here."
        />
      </SectionCard>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {forms.map((f) => (
          <SectionCard
            key={f.id}
            title={f.title}
            description={`${f.formNo} · ${CONSENT_CATEGORY_LABELS[f.category]}`}
            action={<StatusBadge status={f.status} />}
          >
            <div className="space-y-2">
              <p className="text-sm font-medium">{f.patientName}</p>
              {f.doctorName ? (
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Stethoscope className="size-3.5" /> Assigned to {f.doctorName}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">{f.body}</p>
              {f.details ? (
                <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">{f.details}</p>
              ) : null}
              <ChecklistSummary form={f} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="text-xs text-muted-foreground">
                {f.status === "SIGNED" ? (
                  <span className="inline-flex items-center gap-1 text-[var(--success)]">
                    <CheckCircle2 className="size-3.5" /> Signed {f.signedAt ? `on ${formatDate(f.signedAt)}` : ""}
                  </span>
                ) : f.status === "DECLINED" ? (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <XCircle className="size-3.5" /> Declined {f.declinedAt ? `on ${formatDate(f.declinedAt)}` : ""}
                  </span>
                ) : (
                  <span>
                    Awaiting signature{f.createdBy ? ` · created by ${f.createdBy}` : ""}
                    {f.doctorSignedAt ? " · doctor confirmed" : ""}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {detailBasePath && (
                  <Link href={`${detailBasePath}/${f.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    <Eye className="size-3.5" /> View / print
                  </Link>
                )}
                {canAddRecords && (
                  <Button variant="outline" size="sm" onClick={() => setAddingRecordFor(f)}>
                    <FilePlus2 className="size-3.5" /> Add record
                  </Button>
                )}
                {canEdit && f.status === "PENDING" && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(f)}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                )}
                {canDoctorSign && f.status === "PENDING" && !f.doctorSignedAt && (
                  <Button variant="outline" size="sm" onClick={() => { setDoctorSigning(f); setDoctorSignature(null); }}>
                    <Stamp className="size-3.5" /> Countersign
                  </Button>
                )}
                {f.status === "SIGNED" && f.signatureDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.signatureDataUrl} alt="Signature" className="h-10 rounded border bg-white px-1" />
                ) : f.status === "PENDING" && canSign ? (
                  <Button size="sm" onClick={() => { setActive(f); setSignature(null); }}>
                    <FileSignature className="size-4" /> Review & sign
                  </Button>
                ) : null}
              </div>
            </div>
          </SectionCard>
        ))}
      </div>

      {editing && (
        <ConsentFormDialog
          form={editing}
          doctors={doctors}
          history={patientHistory?.[editing.patientId]}
          open
          onOpenChange={(o) => { if (!o) setEditing(null); }}
        />
      )}

      {addingRecordFor && (
        <AddMedicalRecordDialog
          patientId={addingRecordFor.patientId}
          open
          onOpenChange={(o) => { if (!o) setAddingRecordFor(null); }}
        />
      )}

      {/* Doctor countersign */}
      <Dialog open={!!doctorSigning} onOpenChange={(o) => !o && setDoctorSigning(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Countersign — {doctorSigning?.title}</DialogTitle>
            <DialogDescription>
              Confirms the risks, alternatives and questions checklist was actually gone through with the patient.
            </DialogDescription>
          </DialogHeader>
          {doctorSigning && !doctorSigning.risksExplained && !doctorSigning.alternativesDiscussed ? (
            <p className="rounded-md border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]">
              The declaration checklist on this form isn&apos;t ticked yet — edit the form first if risks and
              alternatives were in fact discussed.
            </p>
          ) : null}
          <div>
            <p className="mb-1.5 text-sm font-medium">Your signature</p>
            <SignaturePad onChange={setDoctorSignature} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoctorSigning(null)}>Cancel</Button>
            <Button onClick={submitDoctorSign} disabled={pending || !doctorSignature}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Countersign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient sign / decline */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
            <DialogDescription>Read carefully, then sign to consent — or decline if you don&apos;t wish to proceed.</DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground scrollbar-thin">
            {active?.body}
            {active?.details ? <p className="mt-2 border-t pt-2">{active.details}</p> : null}
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Your signature</p>
            <SignaturePad onChange={setSignature} />
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => { setDeclining(active); setDeclineReason(""); }}
            >
              <XCircle className="size-4" /> Decline instead
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
              <Button onClick={submit} disabled={pending || !signature}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Submit consent
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline reason */}
      <Dialog open={!!declining} onOpenChange={(o) => !o && setDeclining(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline consent</DialogTitle>
            <DialogDescription>This is recorded permanently against the form — tell us why.</DialogDescription>
          </DialogHeader>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
            placeholder="Reason for declining…"
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDecline} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Confirm decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
