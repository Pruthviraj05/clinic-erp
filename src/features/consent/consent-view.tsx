"use client";

import { useState, useTransition } from "react";
import { FileSignature, Loader2, CheckCircle2, Pencil, Stethoscope } from "lucide-react";
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
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SignaturePad } from "@/components/shared/signature-pad";
import { EmptyState } from "@/components/shared/empty-state";
import { signConsentAction } from "@/server/actions/consent.actions";
import { ConsentFormDialog, type ConsentRefOption } from "./consent-form-dialog";
import { formatDate } from "@/lib/format";
import type { ConsentFormItem } from "@/server/demo/extra";

export function ConsentView({
  forms,
  canSign = false,
  canEdit = false,
  doctors = [],
}: {
  forms: ConsentFormItem[];
  canSign?: boolean;
  /** Reception + the assigned doctor may edit an unsigned form. */
  canEdit?: boolean;
  doctors?: ConsentRefOption[];
}) {
  const [active, setActive] = useState<ConsentFormItem | null>(null);
  const [editing, setEditing] = useState<ConsentFormItem | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
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
          <SectionCard key={f.id} title={f.title} action={<StatusBadge status={f.status} />}>
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
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="text-xs text-muted-foreground">
                {f.status === "SIGNED" ? (
                  <span className="inline-flex items-center gap-1 text-[var(--success)]">
                    <CheckCircle2 className="size-3.5" /> Signed {f.signedAt ? `on ${formatDate(f.signedAt)}` : ""}
                  </span>
                ) : (
                  <span>Awaiting signature{f.createdBy ? ` · created by ${f.createdBy}` : ""}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && f.status !== "SIGNED" && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(f)}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                )}
                {f.status === "SIGNED" && f.signatureDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.signatureDataUrl} alt="Signature" className="h-10 rounded border bg-white px-1" />
                ) : canSign ? (
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
          open
          onOpenChange={(o) => { if (!o) setEditing(null); }}
        />
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
            <DialogDescription>Read carefully and sign to provide your consent.</DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground scrollbar-thin">
            {active?.body}
            {active?.details ? <p className="mt-2 border-t pt-2">{active.details}</p> : null}
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Your signature</p>
            <SignaturePad onChange={setSignature} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={submit} disabled={pending || !signature}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Submit consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
