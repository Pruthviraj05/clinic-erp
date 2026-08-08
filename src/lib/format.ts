import { appConfig } from "@/config/app.config";

/** Currency formatting (INR by default). Accepts number or Decimal-like. */
export function formatCurrency(
  value: number | string | null | undefined,
  currency = appConfig.defaultCurrency,
): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat(appConfig.defaultLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Compact currency for KPI tiles: ₹1.2L, ₹3.4Cr style via Intl. */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat(appConfig.defaultLocale, {
    style: "currency",
    currency: appConfig.defaultCurrency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(appConfig.defaultLocale).format(value);
}

export function formatDate(
  date: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  // Pin to the clinic timezone: identical output during SSR (server OS TZ)
  // and after hydration (browser TZ) — otherwise timestamps shift and React
  // logs hydration mismatches on any non-IST runtime.
  return new Intl.DateTimeFormat(appConfig.defaultLocale, {
    timeZone: appConfig.defaultTimezone,
    ...opts,
  }).format(d);
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(appConfig.defaultLocale, {
    timeZone: appConfig.defaultTimezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** "3 years, 2 months" style age from a date of birth. */
export function formatAge(dob: Date | string | null | undefined): string {
  if (!dob) return "—";
  const d = typeof dob === "string" ? new Date(dob) : dob;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return `${years} yrs`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

/** Human label from an ENUM_VALUE ("NO_SHOW" -> "No show"). */
export function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
