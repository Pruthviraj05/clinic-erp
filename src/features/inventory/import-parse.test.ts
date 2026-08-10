import { describe, it, expect } from "vitest";
import { mapHeaders, parseImportRows, importableRows } from "./import-parse";

const catalog = [
  { id: "med_1", name: "Etoricoxib 90mg", stockQty: 120 },
  { id: "med_4", name: "Methotrexate 7.5mg", stockQty: 40 },
];

describe("mapHeaders", () => {
  it("matches headers regardless of case, spacing and punctuation", () => {
    const map = mapHeaders(["Medicine Name", " QTY ", "Re-order Level", "M.R.P."]);
    expect(map.name).toBe("Medicine Name");
    expect(map.quantity).toBe(" QTY ");
    expect(map.reorderLevel).toBe("Re-order Level");
    expect(map.sellPrice).toBe("M.R.P.");
  });

  it("ignores columns it does not understand", () => {
    expect(mapHeaders(["Batch", "HSN"])).toEqual({});
  });
});

describe("parseImportRows", () => {
  it("matches existing medicines by name and reports their current stock", () => {
    const { rows, fatal } = parseImportRows(
      [{ Medicine: "etoricoxib 90MG", Qty: 50 }],
      catalog,
    );
    expect(fatal).toBeUndefined();
    expect(rows[0]).toMatchObject({ medicineId: "med_1", currentStock: 120, quantity: 50 });
    expect(rows[0].error).toBeUndefined();
  });

  it("treats an unmatched name as a new medicine and requires a price", () => {
    const { rows } = parseImportRows([{ Medicine: "Pregabalin 75mg", Qty: 30 }], catalog);
    expect(rows[0].medicineId).toBeUndefined();
    expect(rows[0].error).toMatch(/needs a price/i);

    const priced = parseImportRows([{ Medicine: "Pregabalin 75mg", Qty: 30, Price: 18 }], catalog);
    expect(priced.rows[0].error).toBeUndefined();
    expect(priced.rows[0].sellPrice).toBe(18);
  });

  it("tolerates currency symbols, commas and padding in numbers", () => {
    const { rows } = parseImportRows(
      [{ Medicine: "Pregabalin 75mg", Qty: " 1,200 ", MRP: "₹18.50" }],
      catalog,
    );
    expect(rows[0].quantity).toBe(1200);
    expect(rows[0].sellPrice).toBe(18.5);
  });

  it("flags bad quantities instead of importing them", () => {
    const { rows } = parseImportRows(
      [
        { Medicine: "Etoricoxib 90mg", Qty: "abc" },
        { Medicine: "Etoricoxib 90mg", Qty: 0 },
        { Medicine: "Etoricoxib 90mg", Qty: 2.5 },
        { Medicine: "Etoricoxib 90mg", Qty: -5 },
      ],
      catalog,
    );
    expect(rows.map((r) => r.error)).toEqual([
      "Quantity is missing or not a number",
      "Quantity must be greater than zero",
      "Quantity must be a whole number",
      "Quantity must be greater than zero",
    ]);
    expect(importableRows(rows)).toHaveLength(0);
  });

  it("skips trailing blank rows without reporting them as errors", () => {
    const { rows } = parseImportRows(
      [{ Medicine: "Etoricoxib 90mg", Qty: 10 }, { Medicine: "", Qty: "" }, { Medicine: "   ", Qty: "" }],
      catalog,
    );
    expect(rows).toHaveLength(1);
  });

  it("refuses the file when the required columns are absent", () => {
    expect(parseImportRows([{ Batch: "A1", HSN: "3004" }], catalog).fatal).toMatch(/medicine-name column/i);
    expect(parseImportRows([{ Medicine: "X" }], catalog).fatal).toMatch(/quantity column/i);
    expect(parseImportRows([], catalog).fatal).toMatch(/no rows/i);
  });

  it("keeps good rows importable alongside bad ones", () => {
    const { rows } = parseImportRows(
      [
        { Medicine: "Etoricoxib 90mg", Qty: 25 },
        { Medicine: "Broken", Qty: "x" },
        { Medicine: "Methotrexate 7.5mg", Qty: 10 },
      ],
      catalog,
    );
    expect(rows).toHaveLength(3);
    expect(importableRows(rows).map((r) => r.medicineId)).toEqual(["med_1", "med_4"]);
  });
});
