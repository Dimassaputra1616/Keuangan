import { z } from "zod";
import { toUtcMidnight } from "@/lib/date";
import { amountSchema, nameSchema, optionalNoteSchema } from "./shared";

/**
 * Skema form piutang.
 *
 * Pembatas nominal (misalnya "pembayaran tidak boleh melebihi sisa") tidak
 * bisa divalidasi di sini karena butuh data pembayaran yang sudah tersimpan.
 * Pemeriksaan itu dilakukan Server Action sebelum menulis ke database.
 */
export const receivableFormSchema = z
  .object({
    personName: nameSchema("Nama orang", 60),
    title: nameSchema("Keperluan", 120),
    amount: amountSchema,
    lentAt: z
      .string({ required_error: "Tanggal pinjam wajib diisi." })
      .refine((value) => toUtcMidnight(value) !== null, {
        message: "Tanggal pinjam tidak valid.",
      }),
    dueAt: z.string().optional(),
    notes: optionalNoteSchema,
    accountId: z.string().min(1, "Akun sumber wajib dipilih."),
    categoryId: z.string().min(1, "Kategori wajib dipilih."),
  })
  .refine(
    (data) => !data.dueAt || toUtcMidnight(data.dueAt) !== null,
    { message: "Tanggal jatuh tempo tidak valid.", path: ["dueAt"] },
  )
  .refine(
    (data) => !data.dueAt || data.dueAt >= data.lentAt,
    {
      message: "Jatuh tempo tidak boleh sebelum tanggal pinjam.",
      path: ["dueAt"],
    },
  );

export type ReceivableFormInput = z.infer<typeof receivableFormSchema>;

/** Skema form pembayaran piutang. */
export const paymentFormSchema = z.object({
  amount: amountSchema,
  receivedAt: z
    .string({ required_error: "Tanggal bayar wajib diisi." })
    .refine((value) => toUtcMidnight(value) !== null, {
      message: "Tanggal bayar tidak valid.",
    }),
  notes: optionalNoteSchema,
  accountId: z.string().min(1, "Akun tujuan wajib dipilih."),
  categoryId: z.string().min(1, "Kategori wajib dipilih."),
});

export type PaymentFormInput = z.infer<typeof paymentFormSchema>;

export const receivableIdSchema = z.object({
  receivableId: z.string().min(1, "ID piutang tidak valid."),
});

export const paymentIdSchema = z.object({
  receivableId: z.string().min(1, "ID piutang tidak valid."),
  paymentId: z.string().min(1, "ID pembayaran tidak valid."),
});