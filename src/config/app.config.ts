/**
 * Global application configuration.
 * Central place for product metadata and feature flags so behaviour can be
 * tuned per environment without touching component code.
 */
export const appConfig = {
  name: "Clinicore",
  shortName: "Clinicore",
  description: "Clinic management system for Dr. Bhosikar's Rheumatology Clinic",
  version: "0.1.0",
  // Data source for this build. Until a real MONGODB_URI is wired up we serve
  // a structured demo dataset so the UI renders end-to-end. Switching to
  // "mongodb" activates the MongoDB storage adapter with zero UI changes
  // (see src/server/repositories/README.md).
  dataMode: (process.env.NEXT_PUBLIC_DATA_MODE ?? "demo") as "demo" | "mongodb",
  // "demo" = role-switch login. "credentials" renders the email/password form
  // (code is ready in lib/auth + the login page; flip when going live).
  authMode: (process.env.NEXT_PUBLIC_AUTH_MODE ?? "demo") as "demo" | "credentials",
  defaultCurrency: "INR",
  defaultLocale: "en-IN",
  defaultTimezone: "Asia/Kolkata",
  support: {
    email: "doctor@gmail.com", // PLACEHOLDER — confirm real support contact
  },
} as const;

export type AppConfig = typeof appConfig;
