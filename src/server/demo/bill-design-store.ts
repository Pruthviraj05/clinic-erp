import { db } from "@/server/repositories";

/**
 * Letterhead design for printed money documents — separate from prescriptions
 * because a pharmacy bill and a consultation invoice are read differently (one
 * is a receipt handed over at the counter, the other a GST tax document) and
 * clinics often want them to look distinct. Clinic-wide (not per-doctor) since
 * billing isn't a doctor's document. Stored via `db.billDesigns`, keyed by kind.
 */
export type BillKind = "PHARMACY" | "CONSULTATION";

export interface BillDesign {
  kind: BillKind;
  /** Printed in place of the old hardcoded "TAX INVOICE" heading. */
  documentTitle: string;
  /** Tagline under the clinic name. */
  headerNote: string;
  /** Fine print at the bottom (return policy, thank-you note, etc.). */
  footerNote: string;
  accentColor: string;
}

export const BILL_ACCENTS = ["#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#b45309", "#166534"];

export function defaultBillDesignFor(kind: BillKind): BillDesign & { id: string } {
  return {
    id: kind,
    kind,
    documentTitle: kind === "PHARMACY" ? "PHARMACY BILL" : "TAX INVOICE",
    headerNote: "",
    footerNote:
      kind === "PHARMACY"
        ? "Medicines once sold are not returnable or exchangeable. Please check items before leaving the counter."
        : "This is a computer-generated invoice. Thank you for choosing us.",
    accentColor: "#0f766e",
  };
}

export async function getBillDesignFor(kind: BillKind): Promise<BillDesign> {
  const own = await db.billDesigns.get(kind);
  return own ?? defaultBillDesignFor(kind);
}
