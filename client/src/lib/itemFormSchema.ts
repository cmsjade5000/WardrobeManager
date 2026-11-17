import { z } from "zod";

export const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["TOP", "BOTTOM", "OUTERWEAR", "ONE_PIECE", "SHOES", "ACCESSORY"]),
  category: z.string().min(1, "Category is required"),
  color: z.string().min(1, "Color is required"),
  imageUrl: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type ItemFormInput = z.input<typeof itemSchema>;
export type ItemFormValues = z.infer<typeof itemSchema>;
