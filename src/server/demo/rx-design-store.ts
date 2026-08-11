import { db } from "@/server/repositories";
import type { PrescriptionTemplate } from "./settings-store";

/**
 * Per-doctor prescription design. Each doctor customizes the header tagline,
 * footer note, accent colour, default print language and the order/visibility
 * of each content block; unset fields fall back to the clinic-wide template
 * from Settings. Stored via `db.rxDesigns`, keyed by `rxDesignKey()` — a
 * doctor's own id for their default design, or `doctorId::branchId` for a
 * design that only applies at one branch (a doctor working across clinics
 * can want a different letterhead at each).
 */
export type RxLanguage = "en" | "mr" | "both";

/** The reorderable/toggleable content blocks between the patient bar and the signature. */
export type RxSectionKey =
  | "vitals"
  | "symptoms"
  | "diagnosis"
  | "medicines"
  | "investigations"
  | "advice"
  | "followUp";

export interface RxSectionConfig {
  key: RxSectionKey;
  visible: boolean;
}

export const RX_SECTION_LABELS: Record<RxSectionKey, string> = {
  vitals: "Vitals",
  symptoms: "Symptoms",
  diagnosis: "Diagnosis",
  medicines: "Medicines (℞)",
  investigations: "Investigations",
  advice: "Advice",
  followUp: "Follow-up date",
};

export const DEFAULT_RX_SECTION_ORDER: RxSectionKey[] = [
  "vitals",
  "symptoms",
  "diagnosis",
  "medicines",
  "investigations",
  "advice",
  "followUp",
];

export interface RxDesign {
  doctorId: string;
  /** Set when this design only applies at one branch; unset = the doctor's default everywhere. */
  branchId?: string;
  /** Tagline under the clinic name (e.g. speciality & timings). */
  headerNote: string;
  /** Fine print at the bottom of the prescription. */
  footerNote: string;
  /** Accent colour for the printed header / rules. */
  accentColor: string;
  /** Default label language on the printout. */
  language: RxLanguage;
  showQr: boolean;
  /** @deprecated superseded by `sections` — kept so old saved designs still merge cleanly. */
  showVitals: boolean;
  /** Order and visibility of each content block, top to bottom. */
  sections: RxSectionConfig[];
}

export const RX_ACCENTS = ["#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#b45309", "#166534"];

/** The composite storage key: a branch override, or the doctor's own default. */
export function rxDesignKey(doctorId: string, branchId?: string): string {
  return branchId ? `${doctorId}::${branchId}` : doctorId;
}

function defaultSections(showVitals: boolean): RxSectionConfig[] {
  return DEFAULT_RX_SECTION_ORDER.map((key) => ({ key, visible: key === "vitals" ? showVitals : true }));
}

/** No design saved yet for this doctor/branch — derive one from the clinic template. */
export function defaultRxDesignFor(
  doctorId: string,
  clinicSettings: PrescriptionTemplate,
  branchId?: string,
): RxDesign & { id: string } {
  return {
    id: rxDesignKey(doctorId, branchId),
    doctorId,
    branchId,
    headerNote: clinicSettings.headerNote,
    footerNote: clinicSettings.footerNote,
    accentColor: RX_ACCENTS[0],
    language: "en",
    showQr: clinicSettings.showQr,
    showVitals: clinicSettings.showVitals,
    sections: defaultSections(clinicSettings.showVitals),
  };
}

/**
 * Resolve the design to print with: a branch-specific override first (if the
 * doctor saved one for this branch), else the doctor's own default, else the
 * clinic-wide template.
 */
export async function getRxDesignFor(doctorId: string, branchId?: string): Promise<RxDesign> {
  if (branchId) {
    const branchDesign = await db.rxDesigns.get(rxDesignKey(doctorId, branchId));
    if (branchDesign) return withSectionsFallback(branchDesign);
  }
  const own = await db.rxDesigns.get(doctorId);
  if (own) return withSectionsFallback(own);
  const settings = await db.settings.get();
  return defaultRxDesignFor(doctorId, settings, branchId);
}

/** All of a doctor's saved designs (their default plus any branch overrides). */
export async function listRxDesignsFor(doctorId: string): Promise<RxDesign[]> {
  return db.rxDesigns.find({ doctorId });
}

/** Old saved rows predate `sections` — backfill from their `showVitals` flag rather than dropping content silently. */
function withSectionsFallback(design: RxDesign): RxDesign {
  if (design.sections && design.sections.length > 0) return design;
  return { ...design, sections: defaultSections(design.showVitals) };
}
