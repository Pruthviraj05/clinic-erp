export interface MedicineRef {
  id: string;
  name: string;
}

/**
 * Resolve a prescribed medicine's free-text name to a catalog entry.
 *
 * Doctors type medicine names by hand, so an exact match is not guaranteed —
 * "Aceclofenac 100mg" may be catalogued as "Aceclofenac 100mg + Paracetamol
 * 325mg". We try exact (case-insensitive) first, then fall back to a prefix
 * match, and give up rather than guess: an unmatched name is surfaced to
 * reception to price manually. Never silently mis-price a line.
 */
export function matchMedicineByName(name: string, catalog: MedicineRef[]): MedicineRef | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;

  const exact = catalog.find((m) => m.name.trim().toLowerCase() === q);
  if (exact) return exact;

  const prefixed = catalog.filter((m) => m.name.trim().toLowerCase().startsWith(q));
  return prefixed.length === 1 ? prefixed[0] : undefined;
}

export interface MatchedLines {
  lines: { medicineId: string; quantity: number }[];
  unmatched: string[];
}

/** Split prescribed medicines into catalog-priced lines and unmatched names. */
export function matchPrescribedMedicines(names: string[], catalog: MedicineRef[]): MatchedLines {
  const lines: { medicineId: string; quantity: number }[] = [];
  const unmatched: string[] = [];
  for (const name of names) {
    const hit = matchMedicineByName(name, catalog);
    if (hit) lines.push({ medicineId: hit.id, quantity: 1 });
    else unmatched.push(name);
  }
  return { lines, unmatched };
}
