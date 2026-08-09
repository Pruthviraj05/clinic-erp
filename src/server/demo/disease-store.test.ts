import { describe, it, expect } from "vitest";
import { createGroup, groupsForDoctor } from "./disease-store";
import { db } from "@/server/repositories";

describe("disease groups", () => {
  it("scopes lists to the owning doctor", async () => {
    await createGroup("doc_scope_test", "RA List");
    const mine = await groupsForDoctor("doc_scope_test");
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((g) => g.doctorId === "doc_scope_test")).toBe(true);
    expect(await groupsForDoctor("doc_scope_other")).toHaveLength(0);
  });

  it("creates an empty list owned by the doctor", async () => {
    const before = (await db.diseaseGroups.list()).length;
    const group = await createGroup("doc_rao", "Thyroid");
    expect((await db.diseaseGroups.list()).length).toBe(before + 1);
    expect(group.doctorId).toBe("doc_rao");
    expect(group.patientIds).toEqual([]);
    expect((await groupsForDoctor("doc_rao")).map((g) => g.name)).toContain("Thyroid");
  });

  it("seeds groups with referentially valid patient ids", async () => {
    for (const g of await db.diseaseGroups.list()) {
      for (const pid of g.patientIds) expect(pid).toMatch(/^pat_/);
    }
  });
});
