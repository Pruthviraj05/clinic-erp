/**
 * Prescription label dictionary — English / Marathi / bilingual rendering for
 * the printed prescription. Clinical content (drug names, doctor notes) prints
 * as typed; only the structural labels translate.
 */
export type RxLang = "en" | "mr" | "both";

export const RX_LANG_OPTIONS: { value: RxLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "mr", label: "मराठी" },
  { value: "both", label: "English + मराठी" },
];

const LABELS = {
  patient: ["Patient", "रुग्ण"],
  ageSex: ["Age / Sex", "वय / लिंग"],
  date: ["Date", "दिनांक"],
  mrn: ["MRN", "नोंदणी क्र."],
  prescriptionId: ["Prescription ID", "प्रिस्क्रिप्शन क्र."],
  phone: ["Phone", "फोन"],
  vitals: ["Vitals", "शारीरिक तपासणी"],
  complaints: ["Complaints", "तक्रारी"],
  symptoms: ["Symptoms", "लक्षणे"],
  diagnosis: ["Diagnosis", "निदान"],
  medications: ["Medications", "औषधे"],
  medicine: ["Medicine", "औषध"],
  dosage: ["Dosage", "मात्रा"],
  frequency: ["Frequency", "वेळा"],
  duration: ["Duration", "कालावधी"],
  instructions: ["Instructions", "सूचना"],
  investigations: ["Investigations", "तपासण्या"],
  advice: ["Advice", "सल्ला"],
  followUp: ["Follow-up", "पुढील भेट"],
  days: ["days", "दिवस"],
  signature: ["Signature & Stamp", "स्वाक्षरी व शिक्का"],
  scanToVerify: ["Scan to verify this prescription.", "प्रिस्क्रिप्शन पडताळणीसाठी स्कॅन करा."],
  beforeFood: ["Before food", "जेवणापूर्वी"],
  afterFood: ["After food", "जेवणानंतर"],
  height: ["Height", "उंची"],
  weight: ["Weight", "वजन"],
  pulse: ["Pulse", "नाडी"],
  temperature: ["Temp", "तापमान"],
} as const;

export type RxLabelKey = keyof typeof LABELS;

export function rxLabel(key: RxLabelKey, lang: RxLang): string {
  const [en, mr] = LABELS[key];
  if (lang === "en") return en;
  if (lang === "mr") return mr;
  return `${en} / ${mr}`;
}

/** Translate free-text timing values that match known presets ("After food"). */
export function rxTiming(value: string | null, lang: RxLang): string | null {
  if (!value) return null;
  if (lang === "en") return value;
  const lower = value.trim().toLowerCase();
  if (lower === "before food") return rxLabel("beforeFood", lang === "both" ? "both" : "mr");
  if (lower === "after food") return rxLabel("afterFood", lang === "both" ? "both" : "mr");
  return value;
}
