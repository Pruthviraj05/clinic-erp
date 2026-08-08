"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared/section-card";
import { saveRxDesignAction } from "@/server/actions/prescription.actions";
import { RX_LANG_OPTIONS, type RxLang } from "@/lib/rx-labels";
import { cn } from "@/lib/utils";
import type { RxDesign } from "@/server/demo/rx-design-store";

const fieldClass =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Doctor designs their own prescription header, footer, accent and language. */
export function RxDesignForm({ design, accents }: { design: RxDesign; accents: string[] }) {
  const [headerNote, setHeaderNote] = useState(design.headerNote);
  const [footerNote, setFooterNote] = useState(design.footerNote);
  const [accentColor, setAccentColor] = useState(design.accentColor);
  const [language, setLanguage] = useState<RxLang>(design.language);
  const [showQr, setShowQr] = useState(design.showQr);
  const [showVitals, setShowVitals] = useState(design.showVitals);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveRxDesignAction({ headerNote, footerNote, accentColor, language, showQr, showVitals });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not save the design.");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
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

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              Show verification QR
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showVitals} onChange={(e) => setShowVitals(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              Show vitals row
            </label>
          </div>

          <div>
            <Button onClick={save} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save design
            </Button>
          </div>
        </div>
      </SectionCard>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
        <div className="rounded-xl border bg-card p-4 text-sm shadow-sm" style={{ borderTop: `4px solid ${accentColor}` }}>
          <p className="text-base font-bold" style={{ color: accentColor }}>Clinicore Central</p>
          <p className="text-xs text-muted-foreground">Bengaluru · +91 80 4123 0001</p>
          {headerNote ? (
            <p className="mt-2 rounded-md px-2 py-1 text-center text-xs" style={{ background: `${accentColor}12`, color: accentColor }}>
              {headerNote}
            </p>
          ) : null}
          <p className="mt-3 font-serif text-xl font-bold italic" style={{ color: accentColor }}>℞</p>
          <p className="text-xs text-muted-foreground">Medicines print here…</p>
          {footerNote ? <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">{footerNote}</p> : null}
        </div>
      </div>
    </div>
  );
}
