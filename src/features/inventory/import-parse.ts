import type { Medicine } from "@/types/domain";

/**
 * Maps a spreadsheet row onto a stock-import line.
 *
 * Column headers are matched loosely (case/spacing/punctuation insensitive)
 * because the file usually comes from a supplier or from this app's own
 * export, and neither uses identical wording. Anything we cannot confidently
 * read is reported as a row error rather than guessed at — a wrong quantity or
 * price silently imported into a pharmacy's stock is worse than a rejected row.
 */

/** Accepted header spellings per field, normalized. */
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "medicine", "medicinename", "item", "itemname", "product", "description"],
  quantity: ["quantity", "qty", "stock", "available", "received", "receivedqty", "openingstock", "count"],
  genericName: ["generic", "genericname", "salt", "composition"],
  category: ["category", "type", "group"],
  brand: ["brand", "manufacturer", "company", "mfr"],
  unit: ["unit", "uom", "pack", "packing"],
  reorderLevel: ["reorderlevel", "reorderat", "reorder", "minstock", "minimum", "min"],
  sellPrice: ["sellprice", "price", "mrp", "rate", "unitprice", "amount"],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Build a {field -> actual column key} map from the sheet's headers. */
export function mapHeaders(headers: string[]): Partial<Record<keyof typeof HEADER_ALIASES, string>> {
  const found: Partial<Record<string, string>> = {};
  for (const header of headers) {
    const norm = normalizeHeader(header);
    if (!norm) continue;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (found[field]) continue;
      if (aliases.includes(norm)) {
        found[field] = header;
        break;
      }
    }
  }
  return found;
}

function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  // Tolerate "₹120.50", "1,200", " 40 "
  const cleaned = String(raw).replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function text(raw: unknown): string {
  return raw === null || raw === undefined ? "" : String(raw).trim();
}

export interface ParsedImportRow {
  /** Set when matched to an existing medicine — that medicine is topped up. */
  medicineId?: string;
  /** The matched medicine's current stock, for the preview. */
  currentStock?: number;
  name: string;
  quantity: number;
  genericName?: string;
  category?: string;
  brand?: string;
  unit?: string;
  reorderLevel?: number;
  sellPrice?: number;
  /** Populated when the row cannot be imported; the row is shown but excluded. */
  error?: string;
}

export interface ParseResult {
  rows: ParsedImportRow[];
  /** File-level problem (no rows, unreadable headers) — nothing is importable. */
  fatal?: string;
}

/**
 * Turn raw sheet records into preview rows, matching each against the existing
 * catalog by name (case-insensitive) so the user can see what will be created
 * versus restocked before anything is written.
 */
export function parseImportRows(
  records: Record<string, unknown>[],
  catalog: Pick<Medicine, "id" | "name" | "stockQty">[],
): ParseResult {
  if (!records.length) return { rows: [], fatal: "That file has no rows." };

  const headers = Object.keys(records[0] ?? {});
  const map = mapHeaders(headers);
  if (!map.name) {
    return { rows: [], fatal: `No medicine-name column found. Expected one of: name, medicine, item, product.` };
  }
  if (!map.quantity) {
    return { rows: [], fatal: `No quantity column found. Expected one of: quantity, qty, stock, received.` };
  }

  const byName = new Map(catalog.map((m) => [m.name.trim().toLowerCase(), m]));

  const rows: ParsedImportRow[] = [];
  for (const rec of records) {
    const name = text(rec[map.name]);
    // Trailing blank lines are normal in exported sheets — skip silently.
    if (!name) continue;

    const qty = toNumber(rec[map.quantity!]);
    const match = byName.get(name.toLowerCase());

    const row: ParsedImportRow = {
      name,
      quantity: qty ?? 0,
      medicineId: match?.id,
      currentStock: match?.stockQty,
      genericName: map.genericName ? text(rec[map.genericName]) || undefined : undefined,
      category: map.category ? text(rec[map.category]) || undefined : undefined,
      brand: map.brand ? text(rec[map.brand]) || undefined : undefined,
      unit: map.unit ? text(rec[map.unit]) || undefined : undefined,
      reorderLevel: map.reorderLevel ? toNumber(rec[map.reorderLevel]) ?? undefined : undefined,
      sellPrice: map.sellPrice ? toNumber(rec[map.sellPrice]) ?? undefined : undefined,
    };

    if (qty === null) row.error = "Quantity is missing or not a number";
    else if (!Number.isInteger(qty)) row.error = "Quantity must be a whole number";
    else if (qty <= 0) row.error = "Quantity must be greater than zero";
    else if (!match && (row.sellPrice === undefined || row.sellPrice < 0)) {
      // A brand-new medicine with no price would be dispensed at ₹0.
      row.error = "New medicine needs a price";
    }

    rows.push(row);
  }

  if (!rows.length) return { rows: [], fatal: "That file has no usable rows." };
  return { rows };
}

/** The rows that will actually be written. */
export function importableRows(rows: ParsedImportRow[]): ParsedImportRow[] {
  return rows.filter((r) => !r.error);
}
