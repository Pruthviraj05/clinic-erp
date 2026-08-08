/**
 * Mutable settings store (demo). In Prisma mode these are Setting rows /
 * PrescriptionTemplate records scoped to the organization/branch.
 */
export interface PrescriptionTemplate {
  headerNote: string;
  footerNote: string;
  showQr: boolean;
  showVitals: boolean;
}

export const prescriptionTemplate: PrescriptionTemplate = {
  headerNote: "Consultation by appointment · Mon–Sat, 9:00 AM – 8:00 PM",
  footerNote:
    "This prescription is valid for 30 days. Please complete the full course of medication. In case of adverse reactions, contact the clinic immediately.",
  showQr: true,
  showVitals: true,
};
