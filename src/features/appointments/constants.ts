/**
 * Zod-free constants for client components. Dialogs import these instead of
 * schema.ts so zod stays out of the client bundle.
 */
export const appointmentTypes = ["SCHEDULED", "WALK_IN", "FOLLOW_UP", "EMERGENCY"] as const;
export const appointmentStatuses = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"] as const;
export const bookingSources = ["WALK_IN", "PHONE", "WEBSITE", "REFERRAL"] as const;
export const bookingSourceLabels: Record<(typeof bookingSources)[number], string> = {
  WALK_IN: "Walk-in",
  PHONE: "Phone",
  WEBSITE: "Website / Portal",
  REFERRAL: "Referral",
};
