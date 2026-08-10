import { db } from "@/server/repositories";
import { newId } from "@/lib/ids";
import type { PrescriptionMedicine } from "@/types/domain";

/**
 * Doctor prescription templates. Quick-start bundles the consult screen
 * applies with one click; doctors can save the current consultation as a new
 * template. Stored via `db.rxTemplates`; `SEED_RX_TEMPLATES` below seeds new
 * deployments with clinic-wide starters (`doctorId: null`).
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


/** Rheumatology-focused quick-start templates — see docs/05-roadmap.md for sourcing notes. */
export const SEED_RX_TEMPLATES: RxTemplate[] = [
  {
    id: "tpl_ra",
    name: "Rheumatoid Arthritis — active flare",
    doctorId: null,
    diagnoses: ["Rheumatoid arthritis (M06.9)"],
    medicines: [
      { name: "Methotrexate 7.5mg", dosage: "1 tablet", frequency: "Weekly", timing: "After food", durationDays: 28, instructions: "Once weekly only — same day each week; take with Folic acid" },
      { name: "Folic Acid 5mg", dosage: "1 tablet", frequency: "Weekly", timing: null, durationDays: 28, instructions: "Take on a different day than Methotrexate" },
      { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 7, instructions: "Short course for flare pain" },
    ],
    advice: ["Joint protection techniques", "Gentle range-of-motion exercises, avoid high-impact activity during flare"],
    investigations: ["CBC", "Liver Function Test", "ESR", "CRP"],
    followUpDays: 28,
  },
  {
    id: "tpl_oa-knee",
    name: "Osteoarthritis — knee",
    doctorId: null,
    diagnoses: ["Osteoarthritis of knee (M17.9)"],
    medicines: [
      { name: "Aceclofenac 100mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 10, instructions: null },
      { name: "Glucosamine + Chondroitin", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 60, instructions: "Long-term supplement, effect builds over weeks" },
    ],
    advice: ["Weight management", "Quadriceps strengthening exercises", "Avoid prolonged squatting/kneeling/stair climbing"],
    investigations: ["X-Ray knee (weight-bearing)"],
    followUpDays: 30,
  },
  {
    id: "tpl_back-pain",
    name: "Mechanical low back pain",
    doctorId: null,
    diagnoses: ["Low back pain (M54.5)"],
    medicines: [
      { name: "Aceclofenac 100mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 7, instructions: null },
      { name: "Thiocolchicoside 4mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 5, instructions: "Muscle relaxant" },
    ],
    advice: ["Avoid heavy lifting and prolonged sitting", "Hot fomentation twice daily", "Core-strengthening exercises once acute pain settles"],
    investigations: ["X-ray LS spine if not improving in 2 weeks"],
    followUpDays: 14,
  },
  {
    id: "tpl_gout",
    name: "Gout — acute attack",
    doctorId: null,
    diagnoses: ["Gout, unspecified (M10.9)"],
    medicines: [
      { name: "Colchicine 0.5mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 3, instructions: "Reduce dose if GI upset" },
      { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 5, instructions: null },
    ],
    advice: ["Avoid alcohol, red meat, organ meats and sugary drinks during the attack", "Increase water intake", "Rest and elevate the affected joint"],
    investigations: ["Serum uric acid", "Renal function test"],
    followUpDays: 14,
  },
  {
    id: "tpl_spondylitis",
    name: "Ankylosing spondylitis — review",
    doctorId: null,
    diagnoses: ["Ankylosing spondylitis (M45)"],
    medicines: [
      { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 30, instructions: "Long-term NSAID for axial symptoms" },
      { name: "Sulfasalazine 500mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 30, instructions: null },
    ],
    advice: ["Daily posture and spinal mobility exercises", "Swimming/back extension exercises encouraged", "Avoid prolonged static postures"],
    investigations: ["ESR", "CRP", "HLA-B27 (if not already done)"],
    followUpDays: 30,
  },
  {
    id: "tpl_fibromyalgia",
    name: "Fibromyalgia — initial management",
    doctorId: null,
    diagnoses: ["Fibromyalgia (M79.7)"],
    medicines: [
      { name: "Pregabalin 75mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: "May cause drowsiness initially" },
      { name: "Amitriptyline 10mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: null },
    ],
    advice: ["Graded aerobic exercise (start low, go slow)", "Sleep hygiene counselling", "Stress management — consider counselling referral"],
    investigations: ["TSH", "CBC", "Vitamin D"],
    followUpDays: 30,
  },
];

/** Templates a doctor may use: their own + every clinic-wide starter. */
export async function getRxTemplatesFor(doctorId: string): Promise<RxTemplate[]> {
  return db.rxTemplates.list((t) => !t.doctorId || t.doctorId === doctorId);
}

export async function addRxTemplate(input: Omit<RxTemplate, "id">): Promise<RxTemplate> {
  const tpl: RxTemplate = { id: newId("tpl"), ...input };
  return db.rxTemplates.insert(tpl);
}
