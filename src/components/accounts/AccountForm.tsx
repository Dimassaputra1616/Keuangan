"use client";

import { useActionState } from "react";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  type AccountType,
  type ActionResult,
} from "@/lib/types";
import {
  Alert,
  alertDuration,
  Button,
  FormField,
  Input,
  Select,
  SignedCurrencyInput,
} from "@/components/ui";

const INITIAL_RESULT: ActionResult = { ok: false, message: "" };

export type AccountDefaults = {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
};

/** Form tambah atau ubah akun, dipakai dua mode lewat prop `account`. */
export function AccountForm({
  action,
  account,
  submitLabel,
}: {
  action: (
    previous: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  account?: AccountDefaults;
  submitLabel: string;
}) {
  const [result, formAction, pending] = useActionState(action, INITIAL_RESULT);
  const errors = result.ok ? undefined : result.errors;

  return (
    <form action={formAction} className="space-y-5">
      {account ? <input type="hidden" name="id" value={account.id} /> : null}

      {result.message ? (
        <Alert
          key={result.message}
          tone={result.ok ? "success" : "error"}
          duration={alertDuration(result)}
        >
          {result.message}
        </Alert>
      ) : null}

      <FormField label="Nama akun" htmlFor="name" required errors={errors?.name}>
        <Input
          id="name"
          name="name"
          defaultValue={account?.name}
          placeholder="Contoh: Rekening BCA"
          invalid={Boolean(errors?.name)}
          maxLength={60}
          required
        />
      </FormField>

      <FormField label="Tipe akun" htmlFor="type" required errors={errors?.type}>
        <Select
          id="type"
          name="type"
          defaultValue={account?.type ?? "TUNAI"}
          invalid={Boolean(errors?.type)}
          required
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACCOUNT_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Saldo awal"
        htmlFor="initialBalance"
        errors={errors?.initialBalance}
        hint="Boleh nol atau negatif untuk kartu kredit yang sudah dipakai."
      >
        <SignedCurrencyInput
          name="initialBalance"
          defaultValue={account?.initialBalance}
          invalid={Boolean(errors?.initialBalance)}
        />
      </FormField>

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : submitLabel}
      </Button>
    </form>
  );
}