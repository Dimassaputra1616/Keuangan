import { z } from "zod";
import { hexColorSchema, kindSchema, nameSchema } from "./shared";

export const categoryFormSchema = z.object({
  name: nameSchema("Nama kategori", 50),
  kind: kindSchema,
  color: hexColorSchema,
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const categoryIdSchema = z.object({
  categoryId: z.string().min(1, "ID kategori tidak valid."),
});