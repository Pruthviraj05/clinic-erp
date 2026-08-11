"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ChevronUp, ChevronDown, Eye, EyeOff, GripVertical } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared/section-card";
import { saveRxDesignAction } from "@/server/actions/prescription.actions";
import { RX_LANG_OPTIONS, type RxLang } from "@/lib/rx-labels";
import { cn } from "@/lib/utils";
import type { RxDesign, RxSectionConfig, RxSectionKey } from "@/server/demo/rx-design-store";

const fieldClass =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const SECTION_LABELS: Record<RxSectionKey, string> = {
  vitals: "Vitals",
  symptoms: "Symptoms",
  diagnosis: "Diagnosis",
  medicines: "Medicines (℞)",
  investigations: "Investigations",
  advice: "Advice",
  followUp: "Follow-up date",
};

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Doctor designs their own prescription: header, footer, accent, language,
 * and the order/visibility of each content block — a structured builder
 * (reorder + show/hide) rather than a free-form canvas, so it can never
 * produce a broken print layout. Optionally scoped to one branch when the
 * doctor practises at more than one.
 */
export function RxDesignForm({
  design,
  accents,
  branchOptions = [],
  currentBranchId,
}: {
  design: RxDesign;
  accents: string[];
  /** Other branches this doctor works at — offered as a design-override scope. */
  branchOptions?: { id: string; label: string }[];
  currentBranchId?: string;
}) {
  const router = useRouter();
  const [headerNote, setHeaderNote] = useState(design.headerNote);
  const [footerNote, setFooterNote] = useState(design.footerNote);
  const [accentColor, setAccentColor] = useState(design.accentColor);
  const [language, setLanguage] = useState<RxLang>(design.language);
  const [showQr, setShowQr] = useState(design.showQr);
  const [sections, setSections] = useState<RxSectionConfig[]>(design.sections);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveRxDesignAction({
        branchId: currentBranchId,
        headerNote,
        footerNote,
        accentColor,
        language,
        showQr,
        sections,
      });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not save the design.");
    });
  }

  function toggleVisible(key: RxSectionKey) {
    setSections((s) => s.map((sec) => (sec.key === key ? { ...sec, visible: !sec.visible } : sec)));
  }

  function move(index: number, delta: number) {
    setSections((s) => moveItem(s, index, index + delta));
  }

  return (
    <div className="space-y-4">
      {branchOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
          <span className="text-sm font-medium">Design for:</span>
          <select
            value={currentBranchId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              router.push(v ? `/doctor/rx-design?branchId=${v}` : "/doctor/rx-design");
            }}
            className={cn(fieldClass, "h-9 w-auto py-0")}
          >
            <option value="">Default (every branch)</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>{b.label} only</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {currentBranchId
              ? "Overrides your default design only when you're at this branch."
              : "Applies everywhere you don't have a branch-specific design saved."}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <SectionCard title="Your prescription design" description="Applies to every prescription you write.">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rx-header">Header line</Label>
                <input
                  id="rx-header"
                  value={headerNote}
                  onChange={(e) => setHeaderNote(e.target.value)}
                  maxLength={200}
                  placeholder="Speciality · clinic timings"
                  className={fieldClass}
                />
                <p className="text-xs text-muted-foreground">Printed under the clinic name — {200 - headerNote.length} characters left.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rx-footer">Footer note</Label>
                <textarea
                  id="rx-footer"
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className={fieldClass}
                />
                <p className="text-xs text-muted-foreground">Fine print at the bottom — {500 - footerNote.length} characters left.</p>
              </div>

              <div className="grid gap-2">
                <Label>Accent colour</Label>
                <div className="flex flex-wrap gap-2">
                  {accents.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Accent ${c}`}
                      onClick={() => setAccentColor(c)}
                      className={cn(
                        "size-8 rounded-full border-2 transition-transform",
                        accentColor === c ? "scale-110 border-foreground" : "border-transparent",
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rx-lang">Default print language</Label>
                <select
                  id="rx-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as RxLang)}
                  className={cn(fieldClass, "h-9 py-0")}
                >
                  {RX_LANG_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Labels translate; medicine names and your notes always print as typed.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} className="size-4 accent-[var(--primary)]" />
                Show verification QR
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Section order"
            description="Move blocks up or down, or hide ones you don't use. The letterhead, patient details and signature always stay fixed at the top and bottom."
          >
            <ul className="space-y-1.5">
              {sections.map((s, i) => (
                <li
                  key={s.key}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    !s.visible && "opacity-50",
                  )}
                >
                  <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{SECTION_LABELS[s.key]}</span>
                  <button
                    type="button"
                    onClick={() => toggleVisible(s.key)}
                    aria-label={s.visible ? `Hide ${SECTION_LABELS[s.key]}` : `Show ${SECTION_LABELS[s.key]}`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {s.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move ${SECTION_LABELS[s.key]} up`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={i === sections.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${SECTION_LABELS[s.key]} down`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>

          <div>
            <Button onClick={save} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save design
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
          <div className="rounded-xl border bg-card p-4 text-sm shadow-sm" style={{ borderTop: `4px solid ${accentColor}` }}>
            <p className="text-base font-bold" style={{ color: accentColor }}>Dr. Bhosikar&apos;s Rheumatology Clinic</p>
            <p className="text-xs text-muted-foreground">Ravet, Pune</p>
            {headerNote ? (
              <p className="mt-2 rounded-md px-2 py-1 text-center text-xs" style={{ background: `${accentColor}12`, color: accentColor }}>
                {headerNote}
              </p>
            ) : null}
            <div className="mt-3 space-y-2 divide-y">
              {sections.filter((s) => s.visible).map((s) => (
                <p key={s.key} className="pt-2 text-xs text-muted-foreground first:pt-0">
                  {s.key === "medicines" ? (
                    <span className="font-serif text-base font-bold italic" style={{ color: accentColor }}>℞ Medicines print here…</span>
                  ) : (
                    SECTION_LABELS[s.key]
                  )}
                </p>
              ))}
            </div>
            {footerNote ? <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">{footerNote}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
