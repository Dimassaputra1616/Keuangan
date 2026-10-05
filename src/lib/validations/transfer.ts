import { z } from "zod";
import { toUtcMidnight } from "@/lib/date";
import { amountSchema, optionalNoteSchema } from "./shared";

/**
 * Skema form transfer antar akun.
 *
 * Bedanya dengan form transaksi: tidak ada `kind` dan tidak ada `categoryId`.
 * Transfer bukan pemasukan maupun pengeluaran, jadi tidak boleh memakai
 * kategori pemasukan/pengeluaran — memaksakan kategori hanya membuka jalan
 * supaya transfer ikut terhitung sebagai income atau expense.
 *
 * `date` tetap disimpan sebagai string `YYYY-MM-DD`; konversi ke UTC midnight
 * dilakukan Server Action lewat `toUtcMidnight()` yang sudah dijamin valid
 * oleh `refine` di bawah.
 */
export const transferFormSchema = z.object({
  amount: amountSchema,
  date: z
    .string({ required_error: "Tanggal wajib diisi." })
    .refine((value) => toUtcMidnight(value) !== null, {
      message: "Tanggal tidak valid.",
    }),
  fromAccountId: z.string().min(1, "Akun asal wajib dipilih."),
  toAccountId: z.string().min(1, "Akun tujuan wajib dipilih."),
  notes: optionalNoteSchema,
});

export type TransferFormInput = z.infer<typeof transferFormSchema>;

/** Skema hapus transfer. */
export const transferIdSchema = z.object({
  transferId: z.string().min(1, "ID transfer tidak valid."),
});
