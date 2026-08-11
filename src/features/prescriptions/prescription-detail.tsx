"use client";

import { useState } from "react";
import { Activity, Printer, Share2, Download, QrCode, Pencil, Languages } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDate, formatAge, humanizeEnum } from "@/lib/format";
import { rxLabel, rxTiming, RX_LANG_OPTIONS, type RxLang } from "@/lib/rx-labels";
import { cn } from "@/lib/utils";
import type { Prescription } from "@/types/domain";

/**
 * Mirrors `RxSectionKey`/`RxSectionConfig` in `server/demo/rx-design-store.ts`
 * — duplicated (not imported) because that module pulls in server-only `db`
 * access and this is a client component.
 */
export type RxSectionKey = "vitals" | "symptoms" | "diagnosis" | "medicines" | "investigations" | "advice" | "followUp";
export interface RxSectionConfig {
  key: RxSectionKey;
  visible: boolean;
}
const DEFAULT_SECTIONS: RxSectionConfig[] = (
  ["vitals", "symptoms", "diagnosis", "medicines", "investigations", "advice", "followUp"] as RxSectionKey[]
).map((key) => ({ key, visible: true }));

export interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  gst?: string;
}

export interface RxPatientInfo {
  mrn: string;
  gender: string;
  dateOfBirth: string | null;
  phone: string;
  allergies?: string | null;
}

/**
 * Printable prescription. `.print-area` is isolated by the print stylesheet so
 * "Print" produces a clean A4 document. Branding (header/footer/accent) comes
 * from the prescribing doctor's own design; labels render in English, Marathi
 * or both. The QR encodes the verification URL for `prescription.qrToken`.
 */
export function PrescriptionDetail({
  prescription: rx,
  clinic,
  doctorMeta,
  qrDataUrl,
  headerNote,
  footerNote,
  showQr = true,
  sections = DEFAULT_SECTIONS,
  accentColor = "#0f766e",
  language = "en",
  patient,
  editHref,
}: {
  prescription: Prescription;
  clinic: ClinicInfo;
  doctorMeta?: string;
  qrDataUrl?: string;
  headerNote?: string;
  footerNote?: string;
  showQr?: boolean;
  /** Order and visibility of each content block — from the doctor's Rx Design. */
  sections?: RxSectionConfig[];
  accentColor?: string;
  language?: RxLang;
  patient?: RxPatientInfo;
  /** When set, an "Edit prescription" button links here (doctor only). */
  editHref?: string;
}) {
  const [lang, setLang] = useState<RxLang>(language);
  const L = (key: Parameters<typeof rxLabel>[0]) => rxLabel(key, lang);

  const vitals = rx.vitals ?? {};
  const vitalItems = [
    [L("height"), vitals.heightCm ? `${vitals.heightCm} cm` : null],
    [L("weight"), vitals.weightKg ? `${vitals.weightKg} kg` : null],
    ["BP", vitals.bp ?? null],
    [L("pulse"), vitals.pulse ? `${vitals.pulse} bpm` : null],
    [L("temperature"), vitals.tempC ? `${vitals.tempC} °C` : null],
    ["SpO₂", vitals.spo2 ? `${vitals.spo2}%` : null],
  ].filter(([, v]) => v);

  return (
    <div className="space-y-4">
      <div className="print-hide flex flex-wrap items-center justify-end gap-2">
        <label className="mr-auto flex items-center gap-1.5 text-sm text-muted-foreground">
          <Languages className="size-4" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as RxLang)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            aria-label="Prescription language"
          >
            {RX_LANG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        {editHref && (
          <Link href={editHref} className={cn(buttonVariants({ variant: "outline" }))}>
            <Pencil className="size-4" /> Edit prescription
          </Link>
        )}
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
          {/* Clinic header */}
          <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: accentColor }}
              >
                <Activity className="size-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold" style={{ color: accentColor }}>{clinic.name}</h1>
                <p className="text-sm text-muted-foreground">{clinic.address}</p>
                <p className="text-sm text-muted-foreground">
                  {clinic.phone}{clinic.gst ? ` · GSTIN: ${clinic.gst}` : ""}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="font-semibold">{rx.doctorName}</p>
              {doctorMeta ? <p className="text-xs text-muted-foreground">{doctorMeta}</p> : null}
            </div>
          </div>

          {headerNote ? (
            <p
              className="rounded-md px-3 py-1.5 text-center text-xs"
              style={{ background: `${accentColor}12`, color: accentColor }}
            >
              {headerNote}
            </p>
          ) : null}

          {/* Patient bar */}
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-4">
            <Field label={L("patient")} value={rx.patientName} />
            {patient ? (
              <Field label={L("ageSex")} value={`${formatAge(patient.dateOfBirth)} · ${humanizeEnum(patient.gender)}`} />
            ) : null}
            <Field label={patient ? L("mrn") : L("prescriptionId")} value={patient ? patient.mrn : rx.id.toUpperCase()} />
            <Field label={L("date")} value={formatDate(rx.createdAt)} />
          </div>

          {patient?.allergies ? (
            <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive">
              ⚠ Allergies: {patient.allergies}
            </p>
          ) : null}

          {/* Content blocks — order and visibility come from the doctor's Rx Design. */}
          <div className="divide-y border-t">
            {sections
              .filter((s) => s.visible)
              .map((s) => {
                const node = (() => {
                  switch (s.key) {
                    case "vitals":
                      return vitalItems.length > 0 ? (
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{L("vitals")}</span>
                          {vitalItems.map(([k, v]) => (
                            <span key={k as string}>
                              <span className="text-muted-foreground">{k}: </span>
                              <span className="font-medium">{v}</span>
                            </span>
                          ))}
                        </div>
                      ) : null;
                    case "symptoms":
                      return rx.symptoms ? <Block title={L("symptoms")} text={rx.symptoms} /> : null;
                    case "diagnosis":
                      return rx.diagnoses.length > 0 ? (
                        <Block title={L("diagnosis")} text={rx.diagnoses.join(", ")} accent={accentColor} />
                      ) : null;
                    case "medicines":
                      return (
                        <div>
                          <div className="mb-3 flex items-center gap-2">
                            <span className="font-serif text-2xl font-bold italic" style={{ color: accentColor }}>℞</span>
                            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{L("medications")}</span>
                          </div>
                          <div className="overflow-x-auto scrollbar-thin">
                            <table className="w-full min-w-[560px] text-sm">
                              <thead>
                                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                                  <th className="pb-2 font-medium">#</th>
                                  <th className="pb-2 font-medium">{L("medicine")}</th>
                                  <th className="pb-2 font-medium">{L("dosage")}</th>
                                  <th className="pb-2 font-medium">{L("frequency")}</th>
                                  <th className="pb-2 font-medium">{L("duration")}</th>
                                  <th className="pb-2 font-medium">{L("instructions")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rx.medicines.map((m, i) => (
                                  <tr key={i} className="border-b last:border-0 align-top">
                                    <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                                    <td className="py-2.5 font-medium">{m.name}</td>
                                    <td className="py-2.5">{m.dosage ?? "—"}</td>
                                    <td className="py-2.5">
                                      <span className="font-mono">{m.frequency ?? "—"}</span>
                                      {m.timing ? <span className="text-muted-foreground"> ({rxTiming(m.timing, lang)})</span> : ""}
                                    </td>
                                    <td className="py-2.5">{m.durationDays ? `${m.durationDays} ${L("days")}` : "—"}</td>
                                    <td className="py-2.5 text-muted-foreground">{m.instructions ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    case "investigations":
                      return rx.investigations.length > 0 ? (
                        <Block title={L("investigations")} text={rx.investigations.join(", ")} />
                      ) : null;
                    case "advice":
                      return rx.advice ? <Block title={L("advice")} text={rx.advice} /> : null;
                    case "followUp":
                      return rx.followUpDate ? (
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{L("followUp")}</p>
                          <p className="text-sm font-semibold" style={{ color: accentColor }}>{formatDate(rx.followUpDate)}</p>
                        </div>
                      ) : null;
                    default:
                      return null;
                  }
                })();
                return node ? <div key={s.key} className="py-4">{node}</div> : null;
              })}
          </div>

          {/* Footer: QR + signature */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-5">
            {showQr ? (
              <div className="flex items-center gap-3">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="Prescription QR" className="size-16 rounded-lg border bg-white p-0.5" />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                    <QrCode className="size-10" />
                  </div>
                )}
                <p className="max-w-[10rem] text-[11px] text-muted-foreground">{L("scanToVerify")}</p>
              </div>
            ) : (
              <div />
            )}
            <div className="text-center">
              <div className="mb-1 h-10 w-40 border-b" />
              <p className="text-sm font-medium">{rx.doctorName}</p>
              <p className="text-[11px] text-muted-foreground">{L("signature")}</p>
            </div>
          </div>

          {footerNote ? (
            <p className="mt-5 border-t pt-4 text-center text-[11px] text-muted-foreground">{footerNote}</p>
          ) : null}
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

function Block({ title, text, accent }: { title: string; text?: string | null; accent?: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm" style={accent ? { color: accent, fontWeight: 600 } : undefined}>{text || "—"}</p>
    </div>
  );
}
