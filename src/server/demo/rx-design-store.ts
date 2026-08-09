import { db } from "@/server/repositories";
import type { PrescriptionTemplate } from "./settings-store";

/**
 * Per-doctor prescription design. Each doctor customizes the header tagline,
 * footer note, accent colour and default print language of their
 * prescriptions; unset fields fall back to the clinic-wide template from
 * Settings. Stored via `db.rxDesigns` (id === doctorId).
 */
export type RxLanguage = "en" | "mr" | "both";

export interface RxDesign {
  doctorId: string;
  /** Tagline under the clinic name (e.g. speciality & timings). */
  headerNote: string;
  /** Fine print at the bottom of the prescription. */
  footerNote: string;
  /** Accent colour for the printed header / rules. */
  accentColor: string;
  /** Default label language on the printout. */
  language: RxLanguage;
  showQr: boolean;
  showVitals: boolean;
}

export const RX_ACCENTS = ["#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#b45309", "#166534"];

/** No design saved yet for this doctor — derive one from the clinic template. */
export function defaultRxDesignFor(
  doctorId: string,
  clinicSettings: PrescriptionTemplate,
): RxDesign & { id: string } {
  return {
    id: doctorId,
    doctorId,
    headerNote: clinicSettings.headerNote,
    footerNote: clinicSettings.footerNote,
    accentColor: RX_ACCENTS[0],
    language: "en",
    showQr: clinicSettings.showQr,
    showVitals: clinicSettings.showVitals,
  };
}

/** Doctor's saved design merged over the clinic-wide defaults. */
export async function getRxDesignFor(doctorId: string): Promise<RxDesign> {
  const own = await db.rxDesigns.get(doctorId);
  if (own) return own;
  const settings = await db.settings.get();
  return defaultRxDesignFor(doctorId, settings);
}
