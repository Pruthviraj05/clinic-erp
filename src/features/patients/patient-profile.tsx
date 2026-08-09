"use client";

import {
  CalendarDays,
  FileText,
  Receipt,
  FolderHeart,
  Phone,
  Mail,
  MapPin,
  Droplet,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatAge, formatCurrency, formatDate, formatDateTime, humanizeEnum, initials } from "@/lib/format";
import { AddMedicalRecordDialog } from "@/features/records/medical-record-dialog";
import type { PatientBundle } from "@/server/services/patients.service";

type TimelineEvent = {
  id: string;
  type: "appointment" | "prescription" | "invoice" | "record";
  title: string;
  subtitle: string;
  at: string;
};

function buildTimeline(b: PatientBundle): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...b.appointments.map((a) => ({
      id: `t_${a.id}`,
      type: "appointment" as const,
      title: `${humanizeEnum(a.type)} appointment — ${a.doctorName}`,
      subtitle: `${a.reason ?? "Consultation"} · ${humanizeEnum(a.status)}`,
      at: a.scheduledStart,
    })),
    ...b.prescriptions.map((p) => ({
      id: `t_${p.id}`,
      type: "prescription" as const,
      title: `Prescription — ${p.doctorName}`,
      subtitle: p.diagnoses.join(", "),
      at: p.createdAt,
    })),
    ...b.invoices.map((i) => ({
      id: `t_${i.id}`,
      type: "invoice" as const,
      title: `Invoice ${i.number}`,
      subtitle: `${formatCurrency(i.totalAmount)} · ${humanizeEnum(i.paymentStatus)}`,
      at: i.createdAt,
    })),
    ...b.records.map((r) => ({
      id: `t_${r.id}`,
      type: "record" as const,
      title: r.title,
      subtitle: `${r.category} · ${r.fileType}`,
      at: r.recordedAt,
    })),
  ];
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

const EVENT_ICON = {
  appointment: CalendarDays,
  prescription: FileText,
  invoice: Receipt,
  record: FolderHeart,
};

export function PatientProfile({
  bundle,
  qrDataUrl,
  canAddRecord = false,
}: {
  bundle: PatientBundle;
  qrDataUrl?: string;
  /** Doctor/staff viewing this profile may add a medical record for this patient. */
  canAddRecord?: boolean;
}) {
  const { patient, appointments, prescriptions, invoices, records } = bundle;
  const timeline = buildTimeline(bundle);
  const outstanding = invoices.reduce((s, i) => s + i.balanceAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary/10 text-lg text-primary">{initials(patient.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{patient.fullName}</h2>
              <StatusBadge status={patient.isActive ? "ACTIVE" : "INACTIVE"} />
            </div>
            <p className="text-sm text-muted-foreground">
              {patient.mrn} · {humanizeEnum(patient.gender)} · {formatAge(patient.dateOfBirth)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm lg:grid-cols-2">
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground"><Phone className="size-4 shrink-0" /> <span className="truncate">{patient.phone}</span></span>
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground"><Mail className="size-4 shrink-0" /> <span className="truncate">{patient.email ?? "—"}</span></span>
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground"><MapPin className="size-4 shrink-0" /> <span className="truncate">{patient.city ?? "—"}</span></span>
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground"><Droplet className="size-4 shrink-0" /> <span className="truncate">{patient.bloodGroup.replace("_", " ")}</span></span>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Clinical background" className="lg:col-span-2">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Info label="Allergies" value={patient.allergies} danger />
                <Info label="Chronic conditions" value={patient.chronicDiseases} />
                <Info label="Date of birth" value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null} />
                <Info label="Registered" value={formatDate(patient.createdAt)} />
              </dl>
              {patient.allergies && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="size-4" /> Allergy alert: {patient.allergies}
                </div>
              )}
            </SectionCard>
            <div className="space-y-4">
              <SectionCard title="Summary">
                <div className="grid gap-3">
                  <Stat icon={CalendarDays} label="Total visits" value={appointments.length} />
                  <Stat icon={FileText} label="Prescriptions" value={prescriptions.length} />
                  <Stat icon={FolderHeart} label="Records" value={records.length} />
                  <Stat icon={Receipt} label="Outstanding" value={formatCurrency(outstanding)} />
                </div>
              </SectionCard>
              {qrDataUrl && (
                <SectionCard title="Digital ID card">
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Patient QR" className="size-24 rounded-lg border bg-white p-1" />
                    <div className="text-sm">
                      <p className="font-semibold">{patient.fullName}</p>
                      <p className="font-mono text-muted-foreground">{patient.mrn}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Scan at reception for instant check-in.</p>
                    </div>
                  </div>
                </SectionCard>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <SectionCard title="Patient timeline" noPadding>
            {timeline.length ? (
              <ol className="relative ml-4 border-l py-2">
                {timeline.map((e) => {
                  const Icon = EVENT_ICON[e.type];
                  return (
                    <li key={e.id} className="relative flex gap-4 py-3 pl-6 pr-4">
                      <span className="absolute -left-3 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{e.subtitle}</p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(e.at)}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState icon={Activity} title="No history yet" />
            )}
          </SectionCard>
        </TabsContent>

        {/* Prescriptions */}
        <TabsContent value="prescriptions" className="mt-4">
          <SectionCard noPadding>
            {prescriptions.length ? (
              <div className="divide-y">
                {prescriptions.map((p) => (
                  <div key={p.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{p.diagnoses.join(", ")}</p>
                      <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.doctorName}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.medicines.map((m, i) => (
                        <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                          {m.name} {m.frequency ? `· ${m.frequency}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No prescriptions" />
            )}
          </SectionCard>
        </TabsContent>

        {/* Records */}
        <TabsContent value="records" className="mt-4 space-y-3">
          {canAddRecord && (
            <div className="flex justify-end">
              <AddMedicalRecordDialog patientId={patient.id} triggerLabel="Add record" />
            </div>
          )}
          <SectionCard noPadding>
            {records.length ? (
              <div className="divide-y">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <FolderHeart className="size-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.category} · {r.fileType} · {r.fileSize}</p>
                      {r.notes ? <p className="mt-0.5 text-xs text-muted-foreground">{r.notes}</p> : null}
                      {r.addedBy ? <p className="mt-0.5 text-[11px] text-muted-foreground/70">Added by {r.addedBy}</p> : null}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(r.recordedAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FolderHeart} title="No records uploaded" />
            )}
          </SectionCard>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="mt-4">
          <SectionCard noPadding>
            {invoices.length ? (
              <div className="divide-y">
                {invoices.map((i) => (
                  <div key={i.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{i.number}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(i.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">{formatCurrency(i.totalAmount)}</span>
                      <StatusBadge status={i.paymentStatus} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Receipt} title="No invoices" />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value, danger }: { label: string; value: string | null | undefined; danger?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={danger && value ? "text-destructive" : ""}>{value || "—"}</dd>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="flex flex-1 items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
    </div>
  );
}
