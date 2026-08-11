"use client";

import { CheckSquare, Printer, Share2, Download, QrCode, Square, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatAge, humanizeEnum } from "@/lib/format";
import { CONSENT_CATEGORY_LABELS, CONSENT_DECLARATION } from "@/lib/consent-categories";
import type { ClinicInfo } from "@/features/prescriptions/prescription-detail";
import type { ConsentFormItem } from "@/server/demo/extra";

export interface ConsentPatientInfo {
  mrn: string;
  gender: string;
  dateOfBirth: string | null;
  phone: string;
  allergies?: string | null;
}

/**
 * Printable, letterhead-branded consent form. Mirrors `PrescriptionDetail`'s
 * print mechanics (`.print-area` isolation via the global print stylesheet)
 * so "Print" produces a clean, filing-ready A4 document — the kind an
 * accreditation audit or a legal dispute would expect to see, not a chat log
 * of who clicked a button.
 */
export function ConsentDetail({
  form,
  clinic,
  doctorMeta,
  patient,
  qrDataUrl,
  accentColor = "#0f766e",
}: {
  form: ConsentFormItem;
  clinic: ClinicInfo;
  doctorMeta?: string;
  patient?: ConsentPatientInfo;
  qrDataUrl?: string;
  accentColor?: string;
}) {
  const declined = form.status === "DECLINED";
  const checklist: { label: string; done: boolean }[] = [
    { label: "Risks explained", done: form.risksExplained },
    { label: "Alternatives discussed", done: form.alternativesDiscussed },
    { label: "Questions answered", done: form.questionsAnswered },
  ];
  if (form.interpreterUsed) checklist.push({ label: "Interpreter used", done: true });

  return (
    <div className="space-y-4">
      <div className="print-hide flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => toast.success("Shared via WhatsApp (demo)")}>
          <Share2 className="size-4" /> Share
        </Button>
        <Button variant="outline" onClick={() => toast.success("PDF generated (demo)")}>
          <Download className="size-4" /> Download PDF
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Print
        </Button>
      </div>

      <div
        className="print-area mx-auto max-w-3xl overflow-hidden rounded-xl border bg-card shadow-sm"
        style={{ borderTop: `4px solid ${accentColor}` }}
      >
        <div className="p-4 sm:p-8">
          {/* Clinic letterhead */}
          <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold" style={{ color: accentColor }}>{clinic.name}</h1>
              <p className="text-sm text-muted-foreground">{clinic.address}</p>
              <p className="text-sm text-muted-foreground">
                {clinic.phone}{clinic.gst ? ` · GSTIN: ${clinic.gst}` : ""}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-semibold">{form.doctorName ?? "—"}</p>
              {doctorMeta ? <p className="text-xs text-muted-foreground">{doctorMeta}</p> : null}
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-wrap items-start justify-between gap-2 pt-4 pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {CONSENT_CATEGORY_LABELS[form.category]} Consent
              </p>
              <h2 className="text-lg font-bold">Informed Consent Form</h2>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Form No: <span className="font-mono font-medium text-foreground">{form.formNo}</span></p>
              <p>Date: {formatDate(form.updatedAt)}</p>
            </div>
          </div>

          {/* Patient bar */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-4">
            <Field label="Patient" value={form.patientName} />
            {patient ? (
              <Field label="Age / Sex" value={`${formatAge(patient.dateOfBirth)} · ${humanizeEnum(patient.gender)}`} />
            ) : null}
            <Field label="UHID" value={patient?.mrn ?? "—"} />
            <Field label="Phone" value={patient?.phone ?? "—"} />
          </div>

          {patient?.allergies ? (
            <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive">
              ⚠ Known allergies: {patient.allergies}
            </p>
          ) : null}

          {/* Nature and purpose */}
          <div className="border-t py-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {form.title}
            </p>
            <p className="text-sm leading-relaxed">{form.body}</p>
          </div>

          {form.details ? (
            <div className="border-t py-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Clinical details
              </p>
              <p className="rounded-md bg-muted/40 p-2.5 text-sm text-muted-foreground">{form.details}</p>
            </div>
          ) : null}

          {/* Declaration */}
          <div className="border-t py-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Patient declaration
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{CONSENT_DECLARATION}</p>
          </div>

          {/* Checklist */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t py-4 text-sm">
            {checklist.map((c) => (
              <span key={c.label} className="inline-flex items-center gap-1.5">
                {c.done ? (
                  <CheckSquare className="size-4" style={{ color: accentColor }} />
                ) : (
                  <Square className="size-4 text-muted-foreground" />
                )}
                {c.label}
              </span>
            ))}
          </div>

          {declined ? (
            <div className="mt-2 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">Consent declined</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{form.declineReason}</p>
                {form.declinedAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(form.declinedAt)}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 border-t pt-5 sm:grid-cols-3">
              <SignatureBlock
                label="Patient's signature"
                name={form.patientName}
                signatureDataUrl={form.signatureDataUrl}
                signedAt={form.signedAt}
              />
              <SignatureBlock
                label="Doctor's signature"
                name={form.doctorName}
                signatureDataUrl={form.doctorSignatureDataUrl}
                signedAt={form.doctorSignedAt}
              />
              {form.witnessName ? (
                <SignatureBlock
                  label="Witness's signature"
                  name={`${form.witnessName}${form.witnessRelation ? ` (${form.witnessRelation})` : ""}`}
                  signatureDataUrl={form.witnessSignatureDataUrl}
                  signedAt={undefined}
                />
              ) : (
                <div />
              )}
            </div>
          )}

          {/* Footer: QR + form metadata */}
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t pt-4">
            <div className="flex items-center gap-3">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Consent verification QR" className="size-14 rounded-lg border bg-white p-0.5" />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                  <QrCode className="size-8" />
                </div>
              )}
              <p className="max-w-[12rem] text-[11px] text-muted-foreground">Scan to verify this consent record.</p>
            </div>
            <p className="text-right text-[11px] text-muted-foreground">
              {form.formNo} · Generated electronically via Clinicore<br />
              This document is part of the patient&apos;s permanent medical record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

function SignatureBlock({
  label,
  name,
  signatureDataUrl,
  signedAt,
}: {
  label: string;
  name?: string;
  signatureDataUrl?: string;
  signedAt?: string;
}) {
  return (
    <div className="text-center">
      {signatureDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={signatureDataUrl} alt={label} className="mx-auto mb-1 h-12 rounded border bg-white px-1" />
      ) : (
        <div className="mb-1 h-12 border-b" />
      )}
      <p className="text-sm font-medium">{name ?? "—"}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {signedAt ? <p className="text-[10px] text-muted-foreground">{formatDateTime(signedAt)}</p> : null}
    </div>
  );
}
