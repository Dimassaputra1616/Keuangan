import { z } from "zod";
import {
  accountPurposeSchema,
  accountTypeSchema,
  nameSchema,
  signedAmountSchema,
} from "./shared";

export const accountFormSchema = z.object({
  name: nameSchema("Nama akun", 60),
  type: accountTypeSchema,
  // `null` berarti belum ditentukan; `resolvePurpose()` yang memperlakukannya
  // sebagai LIQUID supaya akun lama tetap masuk hitungan uang aman digunakan.
  purpose: accountPurposeSchema,
  initialBalance: signedAmountSchema,
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;

export const accountIdSchema = z.object({
  accountId: z.string().min(1, "ID akun tidak valid."),
});