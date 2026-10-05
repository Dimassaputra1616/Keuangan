import { z } from "zod";
import { toUtcMidnight } from "@/lib/date";
import {
  amountSchema,
  kindSchema,
  nameSchema,
  optionalNoteSchema,
} from "./shared";

/**
 * Skema form transaksi.
 *
 * `date` tetap disimpan sebagai string `YYYY-MM-DD` di sini; konversi ke UTC
 * midnight dilakukan Server Action lewat `toUtcMidnight()` yang sudah dijamin
 * valid oleh `refine` di bawah.
 */
export const transactionFormSchema = z.object({
  kind: kindSchema,
  amount: amountSchema,
  date: z
    .string({ required_error: "Tanggal wajib diisi." })
    .refine((value) => toUtcMidnight(value) !== null, {
      message: "Tanggal tidak valid.",
    }),
  description: nameSchema("Keterangan", 120),
  notes: optionalNoteSchema,
  accountId: z.string().min(1, "Akun wajib dipilih."),
  categoryId: z.string().min(1, "Kategori wajib dipilih."),
});

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;

/** Skema hapus transaksi. */
export const deleteTransactionSchema = z.object({
  transactionId: z.string().min(1, "ID transaksi tidak valid."),
});