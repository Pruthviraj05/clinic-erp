import { z } from "zod";

export const addMedicineSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  genericName: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  brand: z.string().max(80).optional(),
  unit: z.string().min(1, "Unit is required").max(30),
  reorderLevel: z.coerce.number().int().min(0).max(100000),
  sellPrice: z.coerce.number().min(0).max(1000000),
  openingStock: z.coerce.number().int().min(0).max(1000000),
});
export type AddMedicineInput = z.infer<typeof addMedicineSchema>;

export const editMedicineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required").max(120),
  genericName: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  brand: z.string().max(80).optional(),
  unit: z.string().min(1, "Unit is required").max(30),
  reorderLevel: z.coerce.number().int().min(0).max(100000),
  sellPrice: z.coerce.number().min(0).max(1000000),
});
export type EditMedicineInput = z.infer<typeof editMedicineSchema>;

export const adjustStockSchema = z.object({
  medicineId: z.string().min(1),
  direction: z.enum(["IN", "OUT"]),
  quantity: z.coerce.number().int().min(1).max(1000000),
  reason: z.string().min(1, "Reason is required").max(200),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
