"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/types";
import { getTodayInputValue } from "@/lib/date";
import { IconArrowRight } from "@/components/Icons";
import {
  Alert,
  alertDuration,
  Button,
  CurrencyInput,
  FormField,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

const INITIAL_RESULT: ActionResult = { ok: false, message: "" };

export type TransferAccountOption = { id: string; name: string };

/**
 * Form transfer antar akun.
 *
 * Sengaja tidak punya field "jenis" maupun "kategori". Transfer bukan
 * pemasukan dan bukan pengeluaran, jadi memaksakan kategori di sini hanya
 * membuka jalan supaya transfer ikut terhitung sebagai income atau expense
 * dan merusak laporan arus kas.
 */
export function TransferForm({
  action,
  accounts,
}: {
  action: (
    previous: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  accounts: TransferAccountOption[];
}) {
  const [result, formAction, pending] = useActionState(action, INITIAL_RESULT);

  const errors = result.ok ? undefined : result.errors;

  return (
    <form action={formAction} className="space-y-6">
      {result.message ? (
        <Alert
          key={result.message}
          tone={result.ok ? "success" : "error"}
          duration={alertDuration(result)}
        >
          {result.message}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
        <FormField
          label="Dari akun"
          htmlFor="fromAccountId"
          required
          errors={errors?.fromAccountId}
        >
          <Select
            id="fromAccountId"
            name="fromAccountId"
            required
            defaultValue=""
            invalid={Boolean(errors?.fromAccountId)}
          >
            <option value="" disabled>
              Pilih akun asal
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </FormField>

        <span
          aria-hidden="true"
          className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-muted text-muted-foreground sm:mt-7 sm:grid"
        >
          <IconArrowRight className="h-5 w-5" />
        </span>

        <FormField
          label="Ke akun"
          htmlFor="toAccountId"
          required
          errors={errors?.toAccountId}
        >
          <Select
            id="toAccountId"
            name="toAccountId"
            required
            defaultValue=""
            invalid={Boolean(errors?.toAccountId)}
          >
            <option value="" disabled>
              Pilih akun tujuan
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nominal"
          htmlFor="amount"
          required
          errors={errors?.amount}
        >
          {/* `CurrencyInput` sudah menaruh prefix "Rp" sendiri, jadi yang perlu
              ditambah hanya atribut penanda untuk pembaca layar. */}
          <CurrencyInput name="amount" />
        </FormField>

        <FormField label="Tanggal" htmlFor="date" required errors={errors?.date}>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={getTodayInputValue()}
            invalid={Boolean(errors?.date)}
          />
        </FormField>
      </div>

      <FormField
        label="Catatan"
        htmlFor="notes"
        hint="Opsional. Misalnya untuk alasan pemindahan dana."
        errors={errors?.notes}
      >
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={500}
          invalid={Boolean(errors?.notes)}
        />
      </FormField>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan transfer"}
        </Button>
      </div>
    </form>
  );
}
