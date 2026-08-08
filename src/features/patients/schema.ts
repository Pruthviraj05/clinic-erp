import { z } from "zod";
import { bloodGroups, genders } from "./constants";

export { bloodGroups, genders };

export const createPatientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().max(80).optional(),
  gender: z.enum(genders).default("UNDISCLOSED"),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.enum(bloodGroups).default("UNKNOWN"),
  phone: z.string().min(6, "A valid phone is required").max(20),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  city: z.string().max(80).optional(),
  allergies: z.string().max(300).optional(),
  chronicDiseases: z.string().max(300).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.extend({
  id: z.string().min(1, "Missing patient id"),
});

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
