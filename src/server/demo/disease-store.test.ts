import { describe, it, expect } from "vitest";
import { createGroup, diseaseGroups, groupsForDoctor } from "./disease-store";

describe("disease groups", () => {
  it("scopes lists to the owning doctor", () => {
    const mine = groupsForDoctor("doc_mehta");
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((g) => g.doctorId === "doc_mehta")).toBe(true);
    expect(groupsForDoctor("doc_rao")).toHaveLength(0);
  });

  it("creates an empty list owned by the doctor", () => {
    const before = diseaseGroups.length;
    const group = createGroup("doc_rao", "Thyroid");
    expect(diseaseGroups.length).toBe(before + 1);
    expect(group.doctorId).toBe("doc_rao");
    expect(group.patientIds).toEqual([]);
    expect(groupsForDoctor("doc_rao").map((g) => g.name)).toContain("Thyroid");
  });

  it("seeds groups with referentially valid patient ids", () => {
    for (const g of diseaseGroups) {
      for (const pid of g.patientIds) expect(pid).toMatch(/^pat_/);
    }
  });
});
