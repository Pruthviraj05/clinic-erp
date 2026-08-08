import { describe, it, expect } from "vitest";
import { createAppointmentSchema } from "./appointments/schema";
import { createPatientSchema } from "./patients/schema";

describe("createAppointmentSchema", () => {
  const valid = {
    branchId: "br_central",
    patientId: "pat_arjun",
    doctorId: "doc_mehta",
    type: "SCHEDULED",
    date: "2026-08-10",
    time: "10:00",
    durationMinutes: "15",
    reason: "Checkup",
  };

  it("accepts a valid payload and coerces duration", () => {
    const r = createAppointmentSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.durationMinutes).toBe(15);
  });

  it("rejects missing patient/doctor/branch", () => {
    expect(createAppointmentSchema.safeParse({ ...valid, patientId: "" }).success).toBe(false);
    expect(createAppointmentSchema.safeParse({ ...valid, doctorId: "" }).success).toBe(false);
    expect(createAppointmentSchema.safeParse({ ...valid, branchId: "" }).success).toBe(false);
  });

  it("rejects an out-of-range duration", () => {
    expect(createAppointmentSchema.safeParse({ ...valid, durationMinutes: "999" }).success).toBe(false);
  });
});

describe("createPatientSchema", () => {
  it("requires first name and a valid phone", () => {
    expect(createPatientSchema.safeParse({ firstName: "A", phone: "+919812345678" }).success).toBe(true);
    expect(createPatientSchema.safeParse({ firstName: "", phone: "+919812345678" }).success).toBe(false);
    expect(createPatientSchema.safeParse({ firstName: "A", phone: "12" }).success).toBe(false);
  });

  it("rejects an invalid email but allows empty", () => {
    expect(createPatientSchema.safeParse({ firstName: "A", phone: "9812345678", email: "nope" }).success).toBe(false);
    expect(createPatientSchema.safeParse({ firstName: "A", phone: "9812345678", email: "" }).success).toBe(true);
  });
});
