import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required").max(120),
  code: z
    .string()
    .min(1, "Code is required")
    .regex(/^[A-Z0-9]{2,6}$/, "Code must be 2-6 uppercase letters/digits"),
  city: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gstNumber: z.string().max(30).optional(),
});

export type BranchInput = z.infer<typeof branchSchema>;

export const doctorSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(120),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  specialization: z.string().max(80).optional(),
  department: z.string().max(80).optional(),
  registrationNo: z.string().max(60).optional(),
  qualifications: z.string().max(200).optional(),
  consultationFee: z.coerce.number().min(0, "Fee cannot be negative"),
  branchIds: z.array(z.string().min(1)).min(1, "Select at least one branch"),
});

export type DoctorInput = z.infer<typeof doctorSchema>;

export const receptionistSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(120),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  branchId: z.string().min(1, "Branch is required"),
  employeeCode: z.string().max(30).optional(),
});

export type ReceptionistInput = z.infer<typeof receptionistSchema>;
