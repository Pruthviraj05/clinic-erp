import { prescriptionTemplate } from "./settings-store";

/**
 * Per-doctor prescription design (demo store). Each doctor customizes the
 * header tagline, footer note, accent colour and default print language of
 * their prescriptions; unset fields fall back to the clinic-wide template
 * from Settings. MongoDB: `rx_designs` collection keyed by doctorId.
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

const designs = new Map<string, RxDesign>([
  [
    "doc_mehta",
    {
      doctorId: "doc_mehta",
      headerNote: "Skin & Aesthetics · Mon–Sat 9:00 AM – 8:00 PM",
      footerNote:
        "This prescription is valid for 30 days. Apply topical medication as directed. Contact the clinic for any adverse reaction.",
      accentColor: "#0f766e",
      language: "en",
      showQr: true,
      showVitals: true,
    },
  ],
]);

/** Doctor's design merged over the clinic-wide defaults. */
export function getRxDesign(doctorId: string): RxDesign {
  const own = designs.get(doctorId);
  if (own) return { ...own };
  return {
    doctorId,
    headerNote: prescriptionTemplate.headerNote,
    footerNote: prescriptionTemplate.footerNote,
    accentColor: RX_ACCENTS[0],
    language: "en",
    showQr: prescriptionTemplate.showQr,
    showVitals: prescriptionTemplate.showVitals,
  };
}

export function saveRxDesign(design: RxDesign): RxDesign {
  designs.set(design.doctorId, { ...design });
  return design;
}
