import { z } from "zod";
import { accountTypeSchema, nameSchema, signedAmountSchema } from "./shared";

export const accountFormSchema = z.object({
  name: nameSchema("Nama akun", 60),
  type: accountTypeSchema,
  initialBalance: signedAmountSchema,
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;

export const accountIdSchema = z.object({
  accountId: z.string().min(1, "ID akun tidak valid."),
});