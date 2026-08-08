import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber, humanizeEnum, initials, formatDate } from "./format";

describe("format helpers", () => {
  it("formats currency with digits", () => {
    expect(formatCurrency(800)).toContain("800");
    expect(formatCurrency("1250.5")).toContain("1,250");
    expect(formatCurrency(null)).toContain("0");
  });

  it("formats numbers with grouping", () => {
    expect(formatNumber(1234567)).toBe("12,34,567"); // en-IN grouping
  });

  it("humanizes enum values", () => {
    expect(humanizeEnum("NO_SHOW")).toBe("No show");
    expect(humanizeEnum("IN_PROGRESS")).toBe("In progress");
    expect(humanizeEnum("PAID")).toBe("Paid");
  });

  it("derives initials", () => {
    expect(initials("Arjun Sharma")).toBe("AS");
    expect(initials("Dr. Ananya Mehta")).toBe("DA");
    expect(initials("Madonna")).toBe("M");
  });

  it("formats and guards dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate("2026-08-02T10:00:00.000Z")).toMatch(/2026/);
  });
});
