import type { PrescriptionMedicine } from "@/types/domain";

/**
 * Doctor prescription templates (demo store). Quick-start bundles the consult
 * screen applies with one click; doctors can save the current consultation as
 * a new template. MongoDB: one `rx_templates` collection keyed by doctorId.
 */
export interface RxTemplate {
  id: string;
  name: string;
  /** Owning doctor, or null for clinic-wide starters. */
  doctorId: string | null;
  diagnoses: string[];
  medicines: PrescriptionMedicine[];
  advice: string[];
  investigations: string[];
  followUpDays: number | null;
}

let templateSeq = 100;

export const rxTemplates: RxTemplate[] = [
  {
    id: "tpl_acne",
    name: "Acne — first visit",
    doctorId: null,
    diagnoses: ["Acne vulgaris (L70.0)"],
    medicines: [
      { name: "Adapalene 0.1% Gel", dosage: "Thin layer", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: "Avoid sun exposure" },
      { name: "Doxycycline 100mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 14, instructions: "Complete the course" },
    ],
    advice: ["Use a gentle cleanser twice daily", "Avoid oil-based cosmetics"],
    investigations: [],
    followUpDays: 14,
  },
  {
    id: "tpl_diabetes",
    name: "Diabetes review",
    doctorId: null,
    diagnoses: ["Type 2 Diabetes Mellitus (E11.9)"],
    medicines: [
      { name: "Metformin 500mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 30, instructions: null },
    ],
    advice: ["Low-carb diet", "30 min brisk walk daily"],
    investigations: ["HbA1c", "Fasting blood sugar"],
    followUpDays: 30,
  },
  {
    id: "tpl_htn",
    name: "Hypertension review",
    doctorId: null,
    diagnoses: ["Essential hypertension (I10)"],
    medicines: [
      { name: "Telmisartan 40mg", dosage: "1 tablet", frequency: "1-0-0", timing: "Before food", durationDays: 30, instructions: "Monitor BP weekly" },
    ],
    advice: ["Reduce salt intake", "Home BP diary — morning & evening"],
    investigations: ["Serum creatinine", "Lipid profile"],
    followUpDays: 30,
  },
  {
    id: "tpl_fever",
    name: "Viral fever",
    doctorId: null,
    diagnoses: ["Viral fever (R50.9)"],
    medicines: [
      { name: "Paracetamol 650mg", dosage: "1 tablet", frequency: "SOS", timing: "After food", durationDays: 5, instructions: "If temperature > 100°F, max 3/day" },
      { name: "Cetirizine 10mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 5, instructions: null },
    ],
    advice: ["Plenty of oral fluids", "Rest for 3 days"],
    investigations: ["CBC if fever persists > 3 days"],
    followUpDays: 3,
  },
  {
    id: "tpl_backpain",
    name: "Low back pain",
    doctorId: null,
    diagnoses: ["Low back pain (M54.5)"],
    medicines: [
      { name: "Aceclofenac 100mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 7, instructions: null },
      { name: "Thiocolchicoside 4mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 5, instructions: null },
    ],
    advice: ["Avoid heavy lifting", "Hot fomentation twice daily", "Back-strengthening stretches after pain settles"],
    investigations: ["X-ray LS spine if not improving in 2 weeks"],
    followUpDays: 14,
  },
];

export function addRxTemplate(input: Omit<RxTemplate, "id">): RxTemplate {
  const tpl: RxTemplate = { id: `tpl_${templateSeq++}`, ...input };
  rxTemplates.unshift(tpl);
  return tpl;
}
