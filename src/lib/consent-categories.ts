import type { ConsentCategory } from "@/server/demo/extra";

export const CONSENT_CATEGORIES: ConsentCategory[] = [
  "PROCEDURE",
  "TREATMENT",
  "INVESTIGATION",
  "DATA_PRIVACY",
  "OTHER",
];

export const CONSENT_CATEGORY_LABELS: Record<ConsentCategory, string> = {
  PROCEDURE: "Procedure",
  TREATMENT: "Treatment",
  INVESTIGATION: "Investigation",
  DATA_PRIVACY: "Data Privacy",
  OTHER: "Other",
};

/** Quick-fill title + body per category — starting point, always editable before saving. */
export const CONSENT_TEMPLATES: Record<ConsentCategory, { title: string; body: string }> = {
  PROCEDURE: {
    title: "Consent for Procedure",
    body: "I consent to undergo the procedure as advised by my treating doctor. The procedure, its purpose, expected benefits, material risks and alternatives have been explained to me in a language I understand. I am aware that outcomes may vary and that no guarantee of a particular result has been given.",
  },
  TREATMENT: {
    title: "Consent for Treatment",
    body: "I consent to the treatment/therapy advised by my treating doctor. The nature of the treatment, its expected benefit, likely duration, possible side effects and the monitoring it requires have been explained to me in a language I understand.",
  },
  INVESTIGATION: {
    title: "Consent for Investigation",
    body: "I consent to the collection of samples and/or the investigation advised by my treating doctor, and to the sharing of the results with the treating clinical team. The reason for the test and what it involves has been explained to me.",
  },
  DATA_PRIVACY: {
    title: "Data Privacy & Medical Records Consent",
    body: "I authorise the clinic to store and process my medical records for the purpose of my treatment and to share them with treating clinicians as needed for continuity of care. I understand my data is handled per applicable privacy regulations and will not be shared for any other purpose without my consent.",
  },
  OTHER: {
    title: "Consent for…",
    body: "",
  },
};

/** Fixed declaration text printed on every letterhead — the legal core of the form. */
export const CONSENT_DECLARATION =
  "I confirm that the above procedure, investigation or treatment — including its purpose, expected benefits, " +
  "material risks and reasonable alternatives — has been explained to me in a language I understand. I have had " +
  "the opportunity to ask questions, and my questions have been answered to my satisfaction. I am giving this " +
  "consent voluntarily, of my own free will, and understand that I may withdraw it at any time before the " +
  "procedure, investigation or treatment begins.";
