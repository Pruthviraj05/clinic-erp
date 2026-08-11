"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveBillDesignAction } from "@/server/actions/billing.actions";
import { cn } from "@/lib/utils";
import type { BillDesign, BillKind } from "@/server/demo/bill-design-store";

const fieldClass =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** One editable letterhead — used twice below, once per bill kind. */
function OneBillDesign({ design, accents }: { design: BillDesign; accents: string[] }) {
  const [documentTitle, setDocumentTitle] = useState(design.documentTitle);
  const [headerNote, setHeaderNote] = useState(design.headerNote);
  const [footerNote, setFooterNote] = useState(design.footerNote);
  const [accentColor, setAccentColor] = useState(design.accentColor);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveBillDesignAction({
        kind: design.kind,
        documentTitle,
        headerNote,
        footerNote,
        accentColor,
      });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message ?? "Could not save the design.");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Document title</Label>
          <input
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            maxLength={60}
            className={fieldClass}
          />
        </div>
        <div className="grid gap-2">
          <Label>Header note</Label>
          <input
            value={headerNote}
            onChange={(e) => setHeaderNote(e.target.value)}
            maxLength={200}
            placeholder="Optional tagline under the clinic name"
            className={fieldClass}
          />
        </div>
        <div className="grid gap-2">
          <Label>Footer note</Label>
          <textarea
            value={footerNote}
            onChange={(e) => setFooterNote(e.target.value)}
            maxLength={500}
            rows={2}
            className={fieldClass}
          />
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
        <div>
          <Button onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
        <div className="rounded-xl border bg-card p-4 text-sm shadow-sm" style={{ borderTop: `4px solid ${accentColor}` }}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-bold" style={{ color: accentColor }}>Dr. Bhosikar&apos;s Rheumatology Clinic</p>
            <p className="text-right text-xs font-bold" style={{ color: accentColor }}>{documentTitle}</p>
          </div>
          {headerNote ? (
            <p className="mt-2 rounded-md px-2 py-1 text-center text-xs" style={{ background: `${accentColor}12`, color: accentColor }}>
              {headerNote}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">Line items print here…</p>
          {footerNote ? <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">{footerNote}</p> : null}
        </div>
      </div>
    </div>
  );
}

const KIND_LABELS: Record<BillKind, string> = { PHARMACY: "Pharmacy bill", CONSULTATION: "Payment invoice" };

/** Pharmacy bills and payment invoices are printed differently and are each independently designable. */
export function BillDesignForm({
  pharmacyDesign,
  consultationDesign,
  accents,
}: {
  pharmacyDesign: BillDesign;
  consultationDesign: BillDesign;
  accents: string[];
}) {
  const [tab, setTab] = useState<BillKind>("PHARMACY");
  const designs: Record<BillKind, BillDesign> = { PHARMACY: pharmacyDesign, CONSULTATION: consultationDesign };

  return (
    <div className="space-y-4">
      <div className="flex items-center rounded-lg border p-0.5 w-fit">
        {(Object.keys(KIND_LABELS) as BillKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === k ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>
      <OneBillDesign key={tab} design={designs[tab]} accents={accents} />
    </div>
  );
}
