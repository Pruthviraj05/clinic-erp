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
  /** Optional supplier-bill photo, base64 data URL (no object storage yet). */
  billPhotoDataUrl: z.string().max(6_000_000).optional(),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

/**
 * One line of a bulk stock import. `medicineId` is set when the row was
 * matched to an existing medicine (stock is topped up); when it is absent the
 * row creates a new medicine with this quantity as its opening stock.
 */
export const importStockRowSchema = z.object({
  medicineId: z.string().optional(),
  name: z.string().min(1, "Name is required").max(120),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(1000000),
  genericName: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  brand: z.string().max(80).optional(),
  unit: z.string().max(30).optional(),
  reorderLevel: z.coerce.number().int().min(0).max(100000).optional(),
  sellPrice: z.coerce.number().min(0).max(1000000).optional(),
});
export type ImportStockRow = z.infer<typeof importStockRowSchema>;

export const importStockSchema = z.object({
  rows: z.array(importStockRowSchema).min(1, "Nothing to import").max(500, "Import at most 500 rows at a time"),
  reference: z.string().max(200).optional(),
  billPhotoDataUrl: z.string().max(6_000_000).optional(),
});
export type ImportStockInput = z.infer<typeof importStockSchema>;
