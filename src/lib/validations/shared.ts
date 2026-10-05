import { z } from "zod";
import {
  isAccountPurpose,
  isAccountType,
  isTransactionKind,
  type AccountPurpose,
  type AccountType,
  type TransactionKind,
} from "@/lib/types";
import { parseRupiahInput, parseSignedRupiahInput } from "@/lib/money";

/**
 * Skema dasar yang dipakai bersama oleh form akun, kategori, dan transaksi.
 *
 * Form selalu mengirim `FormData`, jadi semua nilai masuk sebagai `string`.
 * Skema di sini membersihkan format masukan sekaligus memberi pesan Bahasa
 * Indonesia per field agar bisa dirender inline lewat `useActionState`.
 */

/** `INCOME` / `EXPENSE`, dipersempit dari `string` ke union type yang sempit. */
export const kindSchema = z
  .string({ required_error: "Jenis transaksi wajib dipilih." })
  .refine(isTransactionKind, { message: "Jenis transaksi tidak dikenal." })
  .transform((value) => value as TransactionKind);

/** `TUNAI` / `BANK` / `EWALLET` / `KREDIT`. */
export const accountTypeSchema = z
  .string({ required_error: "Tipe akun wajib dipilih." })
  .refine(isAccountType, { message: "Tipe akun tidak dikenal." })
  .transform((value) => value as AccountType);

/**
 * Peran akun: `LIQUID` / `SAVINGS` / `GOAL_FUND` / `EMERGENCY`.
 *
 * Nilai kosong berarti "belum ditentukan" dan disimpan sebagai `null`, bukan
 * `LIQUID`. Alasannya kolomnya nullable supaya akun lama yang dibuat sebelum
 * fitur ini tetap terbaca sebagai belum ditentukan, dan `resolvePurpose()`
 * yang memutuskan perlakuannya — bukan form yang menebak-nebak.
 */
export const accountPurposeSchema = z
  .string()
  .transform((value) => value.trim())
  .transform((value, ctx) => {
    if (value === "") return null;

    if (!isAccountPurpose(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Peran akun tidak dikenal.",
      });
      return z.NEVER;
    }

    return value as AccountPurpose;
  });

/**
 * Nominal transaksi: wajib positif, sudah dibersihkan dari pemisah ribuan.
 *
 * Pola `ctx.addIssue` + `z.NEVER` dipakai supaya tipe keluaran benar-benar
 * `number`, bukan `number | null`. Dengan begitu Prisma tidak perlu narrowing
 * manual di setiap Server Action.
 */
export const amountSchema = z
  .string({ required_error: "Nominal wajib diisi." })
  .min(1, "Nominal wajib diisi.")
  .transform((value, ctx) => {
    const parsed = parseRupiahInput(value);

    if (parsed === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Nominal harus berupa angka positif dan maksimal Rp 2.147.483.647.",
      });
      return z.NEVER;
    }

    return parsed;
  });

/** Saldo awal akun: boleh nol atau negatif (misalnya overdraft kartu kredit). */
export const signedAmountSchema = z
  .string()
  .transform((value, ctx) => {
    const parsed = parseSignedRupiahInput(value);

    if (parsed === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Saldo awal harus berupa angka dan maksimal Rp 2.147.483.647.",
      });
      return z.NEVER;
    }

    return parsed;
  });

export function nameSchema(label: string, max: number) {
  return z
    .string({ required_error: `${label} wajib diisi.` })
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(max, `${label} maksimal ${max} karakter.`);
}

export const optionalNoteSchema = z
  .string()
  .trim()
  .max(500, "Catatan maksimal 500 karakter.");

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Warna harus format #rrggbb, contoh #22c55e.");