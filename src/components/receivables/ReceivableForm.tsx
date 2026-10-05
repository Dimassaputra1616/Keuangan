"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/types";
import { getTodayInputValue, toDateInputValue } from "@/lib/date";
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

export type SelectOption = { id: string; name: string };

export type ReceivableDefaults = {
  id: string;
  personName: string;
  title: string;
  amount: number;
  lentAt: string;
  dueAt: string;
  notes: string | null;
  accountId: string;
  categoryId: string;
};

/**
 * Form piutang untuk mode tambah maupun ubah.
 *
 * Akun menentukan dari mana uang keluar, kategori harus bertipe pengeluaran.
 * Saat piutang disimpan, Server Action otomatis membuat transaksi kas yang
 * terhubung supaya arus kas tetap akurat.
 */
export function ReceivableForm({
  action,
  accounts,
  expenseCategories,
  defaultAccountId,
  defaultCategoryId,
  receivable,
  submitLabel,
}: {
  action: (
    previous: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  accounts: SelectOption[];
  expenseCategories: SelectOption[];
  defaultAccountId?: string;
  defaultCategoryId?: string;
  receivable?: ReceivableDefaults;
  submitLabel: string;
}) {
  const [result, formAction, pending] = useActionState(action, INITIAL_RESULT);
  const errors = result.ok ? undefined : result.errors;

  return (
    <form action={formAction} className="space-y-5">
      {receivable ? <input type="hidden" name="id" value={receivable.id} /> : null}

      {result.message ? (
        <Alert
          key={result.message}
          tone={result.ok ? "success" : "error"}
          duration={alertDuration(result)}
        >
          {result.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Nama orang"
          htmlFor="personName"
          required
          errors={errors?.personName}
        >
          <Input
            id="personName"
            name="personName"
            defaultValue={receivable?.personName}
            placeholder="Contoh: Budi Santoso"
            invalid={Boolean(errors?.personName)}
            maxLength={60}
            required
          />
        </FormField>

        <FormField
          label="Keperluan"
          htmlFor="title"
          required
          errors={errors?.title}
          hint="Misalnya modal usaha atau kebutuhan mendesak."
        >
          <Input
            id="title"
            name="title"
            defaultValue={receivable?.title}
            placeholder="Contoh: Modal jualan kue"
            invalid={Boolean(errors?.title)}
            maxLength={120}
            required
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField
          label="Nominal dipinjam"
          htmlFor="amount"
          required
          errors={errors?.amount}
        >
          <CurrencyInput
            name="amount"
            defaultValue={receivable?.amount}
            invalid={Boolean(errors?.amount)}
          />
        </FormField>

        <FormField
          label="Tanggal pinjam"
          htmlFor="lentAt"
          required
          errors={errors?.lentAt}
        >
          <Input
            id="lentAt"
            name="lentAt"
            type="date"
            defaultValue={
              receivable
                ? toDateInputValue(new Date(receivable.lentAt))
                : getTodayInputValue()
            }
            invalid={Boolean(errors?.lentAt)}
            required
          />
        </FormField>

        <FormField
          label="Jatuh tempo"
          htmlFor="dueAt"
          errors={errors?.dueAt}
          hint="Boleh dikosongkan."
        >
          <Input
            id="dueAt"
            name="dueAt"
            type="date"
            defaultValue={receivable?.dueAt ?? ""}
            invalid={Boolean(errors?.dueAt)}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Akun sumber"
          htmlFor="accountId"
          required
          errors={errors?.accountId}
          hint="Rekening yang uangnya keluar."
        >
          <Select
            id="accountId"
            name="accountId"
            defaultValue={receivable?.accountId ?? defaultAccountId ?? ""}
            invalid={Boolean(errors?.accountId)}
            required
          >
            <option value="" disabled>
              Pilih akun
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Kategori"
          htmlFor="categoryId"
          required
          errors={errors?.categoryId}
          hint="Sebaiknya kategori Piutang agar mudah direkonsiliasi."
        >
          <Select
            id="categoryId"
            name="categoryId"
            defaultValue={receivable?.categoryId ?? defaultCategoryId ?? ""}
            invalid={Boolean(errors?.categoryId)}
            required
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Catatan" htmlFor="notes" errors={errors?.notes}>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Opsional, misalnya kesepakatan termin"
          defaultValue={receivable?.notes ?? ""}
          maxLength={500}
        />
      </FormField>

      <div className="border-t border-border pt-5">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Menyimpan…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}