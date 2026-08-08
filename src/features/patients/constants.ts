/**
 * Zod-free constants for client components. Dialogs import these instead of
 * schema.ts so zod stays out of the client bundle.
 */
export const genders = ["MALE", "FEMALE", "OTHER", "UNDISCLOSED"] as const;
export const bloodGroups = ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "O_POSITIVE", "O_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "UNKNOWN"] as const;
