/**
 * Billing rates shared by the server actions that create invoices and the
 * dialogs that quote a total at the counter.
 *
 * These MUST be one source of truth: when the dialog computed its own total
 * without GST, reception quoted (and collected) 12% less than the invoice
 * recorded as paid, so every pharmacy bill left the drawer short.
 */

/** GST applied to dispensed medicines (standard pharma slab). */
export const PHARMACY_GST_RATE = 0.12;

/** Round to 2 decimals — money never leaves a calculation unrounded. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
