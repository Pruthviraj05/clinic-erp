import { describe, it, expect } from "vitest";
import { matchMedicineByName, matchPrescribedMedicines } from "./medicine-match";
import { medicines } from "@/server/demo/data";

const catalog = medicines.map((m) => ({ id: m.id, name: m.name }));

describe("matchMedicineByName", () => {
  it("matches the catalog name exactly, ignoring case and padding", () => {
    expect(matchMedicineByName("Etoricoxib 90mg", catalog)?.id).toBe("med_1");
    expect(matchMedicineByName("  etoricoxib 90MG ", catalog)?.id).toBe("med_1");
  });

  it("resolves a shorthand name when exactly one catalog entry starts with it", () => {
    // Catalogued as "Aceclofenac 100mg + Paracetamol 325mg"; doctors often
    // write just the lead ingredient.
    expect(matchMedicineByName("Aceclofenac 100mg", catalog)?.id).toBe("med_3");
  });

  it("refuses to guess when a prefix is ambiguous", () => {
    const ambiguous = [
      { id: "a", name: "Vitamin D3 60000IU" },
      { id: "b", name: "Vitamin D3 1000IU" },
    ];
    expect(matchMedicineByName("Vitamin D3", ambiguous)).toBeUndefined();
  });

  it("returns nothing for a medicine that isn't stocked", () => {
    expect(matchMedicineByName("Pregabalin 75mg", catalog)).toBeUndefined();
    expect(matchMedicineByName("", catalog)).toBeUndefined();
  });
});

describe("matchPrescribedMedicines", () => {
  it("splits prescribed names into priced lines and unmatched names", () => {
    const { lines, unmatched } = matchPrescribedMedicines(
      ["Methotrexate 7.5mg", "Folic Acid 5mg", "Pregabalin 75mg"],
      catalog,
    );
    expect(lines).toEqual([
      { medicineId: "med_4", quantity: 1 },
      { medicineId: "med_18", quantity: 1 },
    ]);
    // Never silently dropped — reception is told to price it manually.
    expect(unmatched).toEqual(["Pregabalin 75mg"]);
  });
});
