"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookmarkPlus,
  Eye,
  EyeOff,
  FileText,
  History,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Stethoscope,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/shared/section-card";
import { TagInput } from "./tag-input";
import {
  createPrescriptionAction,
  saveRxTemplateAction,
  updatePrescriptionAction,
} from "@/server/actions/prescription.actions";
import { createDiseaseGroupAction, setPatientInGroupAction } from "@/server/actions/disease.actions";
import { formatAge, formatDate, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RxTemplate } from "@/server/demo/template-store";
import type { RxDesign } from "@/server/demo/rx-design-store";
import type { ClinicHeader } from "@/lib/clinic";
import type { Appointment, Patient, Prescription, PrescriptionMedicine } from "@/types/domain";

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const FREQ_PRESETS = ["1-0-0", "0-0-1", "1-0-1", "1-1-1", "½-0-0", "SOS", "Weekly"];
const TIMING_PRESETS = ["Before food", "After food"];
const DURATION_PRESETS = [3, 5, 7, 10, 15, 30, 45, 90];
const FOLLOW_UP_PRESETS = [
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "6 weeks", days: 42 },
];

const emptyMed = (): PrescriptionMedicine => ({
  name: "",
  dosage: null,
  frequency: "1-0-1",
  timing: null,
  durationDays: 7,
  instructions: null,
});

function ymdFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Vitals {
  bp: string;
  pulse: string;
  weightKg: string;
  heightCm: string;
  tempC: string;
  spo2: string;
}

export interface DiseaseGroupOption {
  id: string;
  name: string;
  hasPatient: boolean;
}

/** Prefill for edit mode (revising an already-saved prescription). */
export interface ConsultPrefill {
  prescriptionId: string;
  vitals: Partial<Vitals>;
  complaints: string[];
  notes: string;
  diagnoses: string[];
  medicines: PrescriptionMedicine[];
  investigations: string[];
  advice: string[];
  followUpDate: string;
}

export function ConsultScreen({
  appointment,
  patient,
  history,
  templates,
  drugOptions,
  diagnosisSuggestions,
  investigationSuggestions,
  clinic,
  doctorMeta,
  rxDesign,
  diseaseGroups = [],
  prefill,
}: {
  appointment: Appointment;
  patient: Patient;
  history: Prescription[];
  templates: RxTemplate[];
  drugOptions: { name: string; sublabel?: string }[];
  diagnosisSuggestions: string[];
  investigationSuggestions: string[];
  clinic: ClinicHeader;
  doctorMeta?: string;
  rxDesign: RxDesign;
  /** Doctor's disease lists — patient can be added to one mid-consult. */
  diseaseGroups?: DiseaseGroupOption[];
  /** Present = editing an existing prescription instead of creating one. */
  prefill?: ConsultPrefill;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEditing = !!prefill;

  const [vitals, setVitals] = useState<Vitals>({
    bp: "", pulse: "", weightKg: "", heightCm: "", tempC: "", spo2: "",
    ...(prefill?.vitals ?? {}),
  });
  const [complaints, setComplaints] = useState<string[]>(
    prefill?.complaints ?? (appointment.reason ? [appointment.reason] : []),
  );
  const [notes, setNotes] = useState(prefill?.notes ?? "");
  const [diagnoses, setDiagnoses] = useState<string[]>(prefill?.diagnoses ?? []);
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>(prefill?.medicines ?? []);
  const [investigations, setInvestigations] = useState<string[]>(prefill?.investigations ?? []);
  const [advice, setAdvice] = useState<string[]>(prefill?.advice ?? []);
  const [followUpDate, setFollowUpDate] = useState<string>(prefill?.followUpDate ?? "");
  const [groups, setGroups] = useState<DiseaseGroupOption[]>(diseaseGroups);
  const [newGroupName, setNewGroupName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [letterhead, setLetterhead] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [allTemplatesOpen, setAllTemplatesOpen] = useState(false);

  const drugNames = useMemo(() => drugOptions.map((d) => d.name), [drugOptions]);

  // What each currently-applied template actually added, so a double-click can
  // remove exactly that — not anything the doctor typed manually, and not
  // values another still-applied template also needs.
  const [appliedTemplates, setAppliedTemplates] = useState<
    Record<string, { diagnoses: string[]; medicineRefs: PrescriptionMedicine[]; advice: string[]; investigations: string[]; followUpValue: string | null }>
  >({});

  function applyTemplate(tpl: RxTemplate) {
    if (appliedTemplates[tpl.id]) return; // already applied — single click doesn't re-apply
    const medicineRefs = tpl.medicines.map((x) => ({ ...x }));
    setDiagnoses((d) => [...new Set([...d, ...tpl.diagnoses])]);
    setMedicines((m) => [...m, ...medicineRefs]);
    setAdvice((a) => [...new Set([...a, ...tpl.advice])]);
    setInvestigations((i) => [...new Set([...i, ...tpl.investigations])]);
    let followUpValue: string | null = null;
    if (tpl.followUpDays && !followUpDate) {
      followUpValue = ymdFromNow(tpl.followUpDays);
      setFollowUpDate(followUpValue);
    }
    setAppliedTemplates((m) => ({
      ...m,
      [tpl.id]: { diagnoses: tpl.diagnoses, medicineRefs, advice: tpl.advice, investigations: tpl.investigations, followUpValue },
    }));
    toast.success(`Applied “${tpl.name}”`);
  }

  function removeTemplate(tpl: RxTemplate) {
    const applied = appliedTemplates[tpl.id];
    if (!applied) return;
    const stillNeeded = (field: "diagnoses" | "advice" | "investigations") =>
      new Set(
        Object.entries(appliedTemplates)
          .filter(([id]) => id !== tpl.id)
          .flatMap(([, v]) => v[field]),
      );
    const keepDiagnoses = stillNeeded("diagnoses");
    const keepAdvice = stillNeeded("advice");
    const keepInvestigations = stillNeeded("investigations");

    setDiagnoses((d) => d.filter((v) => !applied.diagnoses.includes(v) || keepDiagnoses.has(v)));
    setAdvice((a) => a.filter((v) => !applied.advice.includes(v) || keepAdvice.has(v)));
    setInvestigations((i) => i.filter((v) => !applied.investigations.includes(v) || keepInvestigations.has(v)));
    setMedicines((m) => m.filter((med) => !applied.medicineRefs.includes(med)));
    setFollowUpDate((f) => (applied.followUpValue && f === applied.followUpValue ? "" : f));
    setAppliedTemplates((m) => {
      const next = { ...m };
      delete next[tpl.id];
      return next;
    });
    toast.success(`Removed “${tpl.name}”`);
  }

  function repeatVisit(rx: Prescription) {
    setDiagnoses((d) => [...new Set([...d, ...rx.diagnoses])]);
    setMedicines((m) => [...m, ...rx.medicines.map((x) => ({ ...x }))]);
    setInvestigations((i) => [...new Set([...i, ...rx.investigations])]);
    if (rx.advice) setAdvice((a) => [...new Set([...a, rx.advice!])]);
    setHistoryOpen(false);
    toast.success("Previous visit loaded into this prescription");
  }

  function updateMed(i: number, patch: Partial<PrescriptionMedicine>) {
    setMedicines((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }

  function numOrUndef(s: string): number | undefined {
    const n = Number(s);
    return s.trim() !== "" && Number.isFinite(n) ? n : undefined;
  }

  function save() {
    const meds = medicines.filter((m) => m.name.trim());
    if (diagnoses.length === 0 && meds.length === 0) {
      toast.error("Add at least a diagnosis or a medicine before saving.");
      return;
    }
    const payload = {
      complaints,
      notes: notes || undefined,
      diagnoses,
      medicines: meds,
      investigations,
      advice,
      followUpDate: followUpDate || null,
      vitals: {
        heightCm: numOrUndef(vitals.heightCm),
        weightKg: numOrUndef(vitals.weightKg),
        bp: vitals.bp.trim() || undefined,
        pulse: numOrUndef(vitals.pulse),
        tempC: numOrUndef(vitals.tempC),
        spo2: numOrUndef(vitals.spo2),
      },
    };
    startTransition(async () => {
      const res = prefill
        ? await updatePrescriptionAction({ ...payload, prescriptionId: prefill.prescriptionId })
        : await createPrescriptionAction({ ...payload, appointmentId: appointment.id });
      if (res.ok && res.data) {
        toast.success(res.message);
        router.push(`/doctor/prescriptions/${res.data.id}`);
      } else {
        toast.error(res.message ?? "Could not save the consultation.");
      }
    });
  }

  function toggleGroup(group: DiseaseGroupOption) {
    const next = !group.hasPatient;
    setGroups((gs) => gs.map((g) => (g.id === group.id ? { ...g, hasPatient: next } : g)));
    startTransition(async () => {
      const res = await setPatientInGroupAction(group.id, patient.id, next);
      if (res.ok) toast.success(res.message);
      else {
        setGroups((gs) => gs.map((g) => (g.id === group.id ? { ...g, hasPatient: !next } : g)));
        toast.error(res.message ?? "Could not update the list.");
      }
    });
  }

  function addGroup() {
    const name = newGroupName.trim();
    if (name.length < 2) return;
    startTransition(async () => {
      const res = await createDiseaseGroupAction(name, patient.id);
      if (res.ok && res.data) {
        setGroups((gs) => [...gs, { id: res.data!.id, name, hasPatient: true }]);
        setNewGroupName("");
        toast.success(res.message);
      } else toast.error(res.message ?? "Could not create the list.");
    });
  }

  function saveTemplate() {
    const meds = medicines.filter((m) => m.name.trim());
    startTransition(async () => {
      const res = await saveRxTemplateAction({
        name: templateName,
        diagnoses,
        medicines: meds,
        advice,
        investigations,
        followUpDays: null,
      });
      if (res.ok) {
        toast.success(res.message);
        setTemplateDialogOpen(false);
        setTemplateName("");
      } else toast.error(res.message ?? "Could not save template.");
    });
  }

  const quickTemplates = templates.slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Patient header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold">{patient.fullName}</h1>
            {appointment.tokenNumber ? (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Token {appointment.tokenNumber}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {patient.mrn} · {formatAge(patient.dateOfBirth)} · {humanizeEnum(patient.gender)} · {patient.phone}
          </p>
          {patient.allergies ? (
            <p className="mt-0.5 text-xs font-medium text-destructive">Allergies: {patient.allergies}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setHistoryOpen(true)}>
            <History className="size-4" />
            Case History
            {history.length > 0 && (
              <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {history.length}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={() => setShowPreview((v) => !v)} className="lg:hidden">
            {showPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showPreview ? "Hide preview" : "Preview"}
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEditing ? "Save changes" : "Save & Complete"}
          </Button>
        </div>
      </div>

      {/* Quick start */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Zap className="size-3.5" /> Quick start
        </span>
        {quickTemplates.map((tpl) => {
          const applied = !!appliedTemplates[tpl.id];
          return (
            <Button
              key={tpl.id}
              type="button"
              variant={applied ? "secondary" : "outline"}
              size="sm"
              title={applied ? "Double-click to remove" : "Click to apply"}
              className={applied ? "border-primary/50" : undefined}
              onClick={() => applyTemplate(tpl)}
              onDoubleClick={() => removeTemplate(tpl)}
            >
              {tpl.name}
            </Button>
          );
        })}
        {templates.length > quickTemplates.length && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAllTemplatesOpen(true)}>
            All templates
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => setTemplateDialogOpen(true)}>
          <BookmarkPlus className="size-3.5" /> Save as template
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ------------------------------------------------ form column */}
        <div className="space-y-4">
          <SectionCard title="Vitals" description="Optional — leave blank if not measured">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {(
                [
                  ["bp", "BP", "120/80", "mmHg"],
                  ["pulse", "Pulse", "78", "bpm"],
                  ["weightKg", "Weight", "70", "kg"],
                  ["heightCm", "Height", "170", "cm"],
                  ["tempC", "Temp", "36.8", "°C"],
                  ["spo2", "SpO₂", "98", "%"],
                ] as const
              ).map(([key, label, placeholder, unit]) => (
                <div key={key} className="grid gap-1.5">
                  <Label className="text-xs">
                    {label} <span className="font-normal text-muted-foreground">{unit}</span>
                  </Label>
                  <input
                    value={vitals[key]}
                    onChange={(e) => setVitals((v) => ({ ...v, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={fieldClass}
                    inputMode={key === "bp" ? "text" : "decimal"}
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Chief complaints & history">
            <div className="space-y-3">
              <TagInput values={complaints} onChange={setComplaints} placeholder="Add a complaint… (Enter to add)" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Examination / history notes…"
                rows={2}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </SectionCard>

          <SectionCard title="Diagnosis">
            <TagInput
              values={diagnoses}
              onChange={setDiagnoses}
              placeholder="Add a diagnosis…"
              suggestions={diagnosisSuggestions}
            />
          </SectionCard>

          <SectionCard
            title="Rx — Medicines"
            description={`${medicines.filter((m) => m.name.trim()).length} item(s)`}
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => setMedicines((m) => [...m, emptyMed()])}>
                <Plus className="size-4" /> Add
              </Button>
            }
          >
            {medicines.length === 0 ? (
              <button
                type="button"
                className="w-full rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40"
                onClick={() => setMedicines([emptyMed()])}
              >
                + Add the first medicine
              </button>
            ) : (
              <div className="space-y-4">
                {medicines.map((med, i) => (
                  <MedicineRow
                    key={i}
                    med={med}
                    drugNames={drugNames}
                    onChange={(patch) => updateMed(i, patch)}
                    onRemove={() => setMedicines((ms) => ms.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Investigations advised">
            <TagInput
              values={investigations}
              onChange={setInvestigations}
              placeholder="Add a test…"
              suggestions={investigationSuggestions}
            />
          </SectionCard>

          <SectionCard title="Advice & instructions">
            <TagInput values={advice} onChange={setAdvice} placeholder="Add advice…" />
          </SectionCard>

          <SectionCard
            title="Disease lists"
            description="Group this patient by condition — visible any time under Disease lists."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {groups.length === 0 && (
                  <p className="text-sm text-muted-foreground">No lists yet — create your first below.</p>
                )}
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    disabled={pending}
                    onClick={() => toggleGroup(g)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                      g.hasPatient
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Stethoscope className="size-3.5" /> {g.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGroup();
                    }
                  }}
                  placeholder="New condition list (e.g. Migraine)…"
                  className={cn(fieldClass, "sm:max-w-xs")}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || newGroupName.trim().length < 2}
                  onClick={addGroup}
                >
                  <Plus className="size-4" /> Create & add
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Follow-up">
            <div className="flex flex-wrap items-center gap-2">
              {FOLLOW_UP_PRESETS.map((p) => {
                const val = ymdFromNow(p.days);
                return (
                  <Button
                    key={p.label}
                    type="button"
                    size="sm"
                    variant={followUpDate === val ? "secondary" : "outline"}
                    onClick={() => setFollowUpDate(followUpDate === val ? "" : val)}
                  >
                    {p.label}
                  </Button>
                );
              })}
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className={cn(fieldClass, "w-auto")}
              />
            </div>
          </SectionCard>
        </div>

        {/* ------------------------------------------------ live preview */}
        <div className={cn("lg:block", showPreview ? "block" : "hidden")}>
          <div className="sticky top-20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live preview · A4</span>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={letterhead}
                  onChange={(e) => setLetterhead(e.target.checked)}
                  className="size-3.5 accent-[var(--primary)]"
                />
                Letterhead
              </label>
            </div>
            <RxPreview
              clinic={clinic}
              doctorName={appointment.doctorName}
              doctorMeta={doctorMeta}
              patient={patient}
              vitals={vitals}
              complaints={complaints}
              notes={notes}
              diagnoses={diagnoses}
              medicines={medicines.filter((m) => m.name.trim())}
              investigations={investigations}
              advice={advice}
              followUpDate={followUpDate}
              letterhead={letterhead}
              design={rxDesign}
            />
          </div>
        </div>
      </div>

      {/* Save-as-template dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              Saves the current diagnosis, medicines, advice and investigations as a one-click starter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="tplName">Template name</Label>
            <input
              id="tplName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Migraine — first visit"
              className={fieldClass}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending || templateName.trim().length < 2} onClick={saveTemplate}>
              {pending && <Loader2 className="size-4 animate-spin" />} Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All templates dialog */}
      <Dialog open={allTemplatesOpen} onOpenChange={setAllTemplatesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Prescription templates</DialogTitle>
            <DialogDescription>Apply a starter — it merges into the current consultation.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {templates.map((tpl) => {
              const applied = !!appliedTemplates[tpl.id];
              return (
                <li key={tpl.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border px-3 py-2 text-left hover:bg-muted/50"
                    onClick={() => {
                      applyTemplate(tpl);
                      setAllTemplatesOpen(false);
                    }}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {tpl.name}
                      {applied && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">Applied</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[tpl.diagnoses.join(", "), tpl.medicines.map((m) => m.name).join(", ")]
                        .filter(Boolean)
                        .join(" · ") || "Empty template"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Case History — one click from the header, full detail per visit */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Case history — {patient.fullName}</DialogTitle>
            <DialogDescription>
              {history.length > 0
                ? `${history.length} previous visit${history.length > 1 ? "s" : ""}, most recent first.`
                : "No previous visits recorded for this patient yet."}
            </DialogDescription>
          </DialogHeader>
          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <History className="size-8 text-muted-foreground/50" />
              This is the first recorded visit — nothing to repeat yet.
            </div>
          ) : (
            <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {history.map((rx) => (
                <li key={rx.id} className="space-y-2.5 rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{rx.diagnoses.join(", ") || "No diagnosis recorded"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(rx.createdAt)} · {rx.doctorName}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => repeatVisit(rx)}>
                        <RotateCcw className="size-3.5" /> Repeat
                      </Button>
                      <Link
                        href={`/doctor/prescriptions/${rx.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        onClick={() => setHistoryOpen(false)}
                      >
                        <FileText className="size-3.5" /> View
                      </Link>
                      <Link
                        href={`/doctor/prescriptions/${rx.id}/edit`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        onClick={() => setHistoryOpen(false)}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </Link>
                    </div>
                  </div>

                  {formatVitals(rx.vitals) && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Vitals: </span>
                      {formatVitals(rx.vitals)}
                    </p>
                  )}

                  {rx.symptoms && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Complaints: </span>
                      {rx.symptoms}
                    </p>
                  )}

                  {rx.medicines.length > 0 && (
                    <ul className="space-y-0.5 rounded-md bg-muted/40 p-2 text-xs">
                      {rx.medicines.map((m, i) => (
                        <li key={i}>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            {[m.dosage, m.frequency, m.timing, m.durationDays ? `${m.durationDays} days` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {rx.investigations.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Investigations: </span>
                      {rx.investigations.join(", ")}
                    </p>
                  )}

                  {rx.advice && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Advice: </span>
                      {rx.advice}
                    </p>
                  )}

                  {rx.followUpDate && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Follow-up was: </span>
                      {formatDate(rx.followUpDate)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function formatVitals(vitals: Prescription["vitals"]): string | null {
  if (!vitals) return null;
  const bits = [
    vitals.bp && `BP ${vitals.bp}`,
    vitals.pulse ? `Pulse ${vitals.pulse}` : null,
    vitals.weightKg ? `Wt ${vitals.weightKg} kg` : null,
    vitals.heightCm ? `Ht ${vitals.heightCm} cm` : null,
    vitals.tempC ? `Temp ${vitals.tempC}°C` : null,
    vitals.spo2 ? `SpO₂ ${vitals.spo2}%` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
}

function MedicineRow({
  med,
  drugNames,
  onChange,
  onRemove,
}: {
  med: PrescriptionMedicine;
  drugNames: string[];
  onChange: (patch: Partial<PrescriptionMedicine>) => void;
  onRemove: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const matches =
    focused && med.name.length >= 2
      ? drugNames.filter((n) => n.toLowerCase().includes(med.name.toLowerCase()) && n !== med.name).slice(0, 6)
      : [];

  const isCustomDuration = med.durationDays != null && !DURATION_PRESETS.includes(med.durationDays);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_130px]">
        <div className="relative">
          <input
            value={med.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search drug or type freely (e.g. Escitalopram 10mg)…"
            className={fieldClass}
          />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
              {matches.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange({ name: n });
                      setFocused(false);
                    }}
                  >
                    {n}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          value={med.dosage ?? ""}
          onChange={(e) => onChange({ dosage: e.target.value || null })}
          placeholder="Dose (1 tablet)"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FREQ_PRESETS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onChange({ frequency: f })}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-xs transition-colors",
              med.frequency === f
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {TIMING_PRESETS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ timing: med.timing === t ? null : t })}
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition-colors",
              med.timing === t
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t}
          </button>
        ))}
        <select
          value={isCustomDuration ? "custom" : String(med.durationDays ?? "")}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "custom") onChange({ durationDays: 21 });
            else onChange({ durationDays: v ? Number(v) : null });
          }}
          className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none"
          aria-label="Duration"
        >
          <option value="">No duration</option>
          {DURATION_PRESETS.map((d) => (
            <option key={d} value={d}>{d} days</option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        {isCustomDuration && (
          <input
            type="number"
            min={1}
            max={365}
            value={med.durationDays ?? ""}
            onChange={(e) => onChange({ durationDays: e.target.value ? Number(e.target.value) : null })}
            className="h-7 w-16 rounded-md border border-input bg-transparent px-2 text-xs outline-none"
            aria-label="Custom duration (days)"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={med.instructions ?? ""}
          onChange={(e) => onChange({ instructions: e.target.value || null })}
          placeholder="Instructions (e.g. at bedtime, with plenty of water)…"
          className={cn(fieldClass, "h-8 flex-1 text-xs")}
        />
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove medicine" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function RxPreview({
  clinic,
  doctorName,
  doctorMeta,
  patient,
  vitals,
  complaints,
  notes,
  diagnoses,
  medicines,
  investigations,
  advice,
  followUpDate,
  letterhead,
  design,
}: {
  clinic: ClinicHeader;
  doctorName: string;
  doctorMeta?: string;
  patient: Patient;
  vitals: Vitals;
  complaints: string[];
  notes: string;
  diagnoses: string[];
  medicines: PrescriptionMedicine[];
  investigations: string[];
  advice: string[];
  followUpDate: string;
  letterhead: boolean;
  design: RxDesign;
}) {
  const accentColor = design.accentColor;
  const vitalBits = [
    vitals.bp && `BP ${vitals.bp}`,
    vitals.pulse && `Pulse ${vitals.pulse}`,
    vitals.weightKg && `Wt ${vitals.weightKg} kg`,
    vitals.heightCm && `Ht ${vitals.heightCm} cm`,
    vitals.tempC && `Temp ${vitals.tempC}°C`,
    vitals.spo2 && `SpO₂ ${vitals.spo2}%`,
  ].filter(Boolean);

  const sections = design.sections.filter((s) => s.visible).map((s) => {
    switch (s.key) {
      case "vitals":
        return vitalBits.length > 0 ? (
          <p key={s.key} className="py-2 text-xs text-muted-foreground">{vitalBits.join(" · ")}</p>
        ) : null;
      case "symptoms":
        return complaints.length > 0 || notes.trim() ? (
          <div key={s.key} className="py-2">
            {complaints.length > 0 && (
              <>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Complaints</p>
                <p>{complaints.join(", ")}</p>
              </>
            )}
            {notes.trim() && (
              <>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Examination / History</p>
                <p className="whitespace-pre-wrap text-xs">{notes}</p>
              </>
            )}
          </div>
        ) : null;
      case "diagnosis":
        return diagnoses.length > 0 ? (
          <div key={s.key} className="py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Diagnosis</p>
            <p style={{ color: accentColor, fontWeight: 600 }}>{diagnoses.join(", ")}</p>
          </div>
        ) : null;
      case "medicines":
        return (
          <div key={s.key} className="py-2">
            <p className="mb-1 font-serif text-lg font-bold italic" style={{ color: accentColor }}>℞</p>
            {medicines.length === 0 ? (
              <p className="text-xs text-muted-foreground">No medicines added.</p>
            ) : (
              <ol className="space-y-1.5">
                {medicines.map((m, i) => (
                  <li key={i} className="text-xs">
                    <span className="font-medium">{i + 1}. {m.name}</span>
                    {m.dosage ? ` — ${m.dosage}` : ""}
                    <span className="text-muted-foreground">
                      {" "}
                      {[m.frequency, m.timing, m.durationDays ? `${m.durationDays} days` : null]
                        .filter(Boolean)
                        .join(" · ")}
                      {m.instructions ? ` · ${m.instructions}` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      case "investigations":
        return investigations.length > 0 ? (
          <div key={s.key} className="py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Investigations</p>
            <p className="text-xs">{investigations.join(", ")}</p>
          </div>
        ) : null;
      case "advice":
        return advice.length > 0 ? (
          <div key={s.key} className="py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Advice</p>
            <ul className="list-inside list-disc text-xs">
              {advice.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null;
      case "followUp":
        return followUpDate ? (
          <p key={s.key} className="py-2 text-xs">
            <span className="text-muted-foreground">Follow-up: </span>
            <span className="font-medium" style={{ color: accentColor }}>{formatDate(followUpDate)}</span>
          </p>
        ) : null;
      default:
        return null;
    }
  });

  return (
    <div className="rounded-xl border bg-card p-4 text-[13px] shadow-sm" style={{ borderTop: `3px solid ${accentColor}` }}>
      {letterhead ? (
        <div className="flex items-start justify-between gap-3 border-b pb-3">
          <div>
            <p className="text-base font-bold" style={{ color: accentColor }}>{clinic.name}</p>
            <p className="text-xs text-muted-foreground">{clinic.address}</p>
            <p className="text-xs text-muted-foreground">{clinic.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{doctorName}</p>
            {doctorMeta && <p className="text-[11px] text-muted-foreground">{doctorMeta}</p>}
          </div>
        </div>
      ) : (
        <div className="border-b pb-3 text-center text-[11px] italic text-muted-foreground">
          Pre-printed letterhead — left blank when printing on your stationery
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-b py-2 text-xs">
        <span><span className="text-muted-foreground">Patient: </span>{patient.fullName}</span>
        <span><span className="text-muted-foreground">Age/Sex: </span>{formatAge(patient.dateOfBirth)} · {humanizeEnum(patient.gender)}</span>
        <span><span className="text-muted-foreground">MRN: </span>{patient.mrn}</span>
        <span><span className="text-muted-foreground">Date: </span>{formatDate(new Date())}</span>
      </div>

      <div className="divide-y">{sections}</div>

      <div className="flex items-end justify-between border-t pt-3">
        <p className="max-w-[55%] text-[10px] text-muted-foreground">{design.footerNote}</p>
        <div className="text-center">
          <div className="mb-1 h-8 w-28 border-b" />
          <p className="text-[11px] font-medium">{doctorName}</p>
        </div>
      </div>
    </div>
  );
}
