"use client";

import { useActionState, useState } from "react";
import {
  TRANSACTION_KINDS,
  TRANSACTION_KIND_LABELS,
  type ActionResult,
  type TransactionKind,
} from "@/lib/types";
import { getTodayInputValue, toDateInputValue } from "@/lib/date";
import { IconArrowDown, IconArrowUp } from "@/components/Icons";
import {
  Alert,
  alertDuration,
  Button,
  CurrencyInput,
  FormField,
  Input,
  Select,
  Textarea,
  cx,
} from "@/components/ui";

const INITIAL_RESULT: ActionResult = { ok: false, message: "" };

export type AccountOption = { id: string; name: string };
export type CategoryOption = {
  id: string;
  name: string;
  kind: TransactionKind;
};

export type TransactionDefaults = {
  id: string;
  kind: TransactionKind;
  amount: number;
  occurredAt: string;
  description: string;
  notes: string | null;
  accountId: string;
  categoryId: string;
};

/**
 * Form transaksi untuk mode tambah maupun ubah.
 *
 * `action` adalah Server Action bertanda tangan `(previous, formData)`, jadi
 * form ini memakai `useActionState` agar pesan kesalahan bisa ditampilkan
 * inline di bawah field terkait tanpa memuat ulang halaman.
 */
export function TransactionForm({
  action,
  accounts,
  categories,
  transaction,
  submitLabel = "Simpan transaksi",
}: {
  action: (
    previous: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  transaction?: TransactionDefaults;
  submitLabel?: string;
}) {
  const [result, formAction, pending] = useActionState(action, INITIAL_RESULT);
  const [kind, setKind] = useState<TransactionKind>(
    transaction?.kind ?? "EXPENSE",
  );

  // Kategori difilter sesuai jenis agar pengguna tidak bisa memilih kategori
  // pemasukan pada transaksi pengeluaran.
  const visibleCategories = categories.filter(
    (category) => category.kind === kind,
  );

  const errors = result.ok ? undefined : result.errors;

  return (
    <form action={formAction} className="space-y-6">
      {transaction ? <input type="hidden" name="id" value={transaction.id} /> : null}

      {result.message ? (
        <Alert
          key={result.message}
          tone={result.ok ? "success" : "error"}
          duration={alertDuration(result)}
        >
          {result.message}
        </Alert>
      ) : null}

      <fieldset>
        <legend className="mb-2 flex items-center gap-1 text-sm font-medium text-foreground">
          Jenis transaksi
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {TRANSACTION_KINDS.map((option) => {
            const isIncome = option === "INCOME";
            const selected = kind === option;
            const Icon = isIncome ? IconArrowDown : IconArrowUp;

            return (
              <label
                key={option}
                className={cx(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition duration-150",
                  selected
                    ? "border-ring bg-surface shadow-sm ring-2 ring-ring/10"
                    : "border-border hover:border-muted-foreground/40 hover:bg-surface-hover",
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={option}
                  checked={selected}
                  onChange={() => setKind(option)}
                  className="sr-only"
                />
                <span
                  className={cx(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
                    selected
                      ? isIncome
                        ? "bg-income-soft text-income"
                        : "bg-expense-soft text-expense"
                      : "bg-surface-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span
                    className={cx(
                      "block text-sm font-medium",
                      selected ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {TRANSACTION_KIND_LABELS[option]}
                  </span>
                  <span className="block text-xs text-subtle-foreground">
                    {isIncome ? "Uang masuk" : "Uang keluar"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {errors?.kind?.[0] ? (
          <p className="mt-1.5 text-xs font-medium text-destructive">
            {errors.kind[0]}
          </p>
        ) : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Nominal"
          htmlFor="amount"
          required
          errors={errors?.amount}
          hint="Tanpa tanda minus. Arah uang ditentukan jenis transaksi."
        >
          <CurrencyInput
            name="amount"
            defaultValue={transaction?.amount}
            invalid={Boolean(errors?.amount)}
          />
        </FormField>

        <FormField label="Tanggal" htmlFor="date" required errors={errors?.date}>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={
              transaction
                ? toDateInputValue(new Date(transaction.occurredAt))
                : getTodayInputValue()
            }
            invalid={Boolean(errors?.date)}
            required
          />
        </FormField>
      </div>

      <FormField
        label="Keterangan"
        htmlFor="description"
        required
        errors={errors?.description}
      >
        <Input
          id="description"
          name="description"
          placeholder="Contoh: Beli makan siang"
          defaultValue={transaction?.description}
          invalid={Boolean(errors?.description)}
          maxLength={120}
          required
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Akun" htmlFor="accountId" required errors={errors?.accountId}>
          <Select
            id="accountId"
            name="accountId"
            defaultValue={transaction?.accountId ?? ""}
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
          hint={`Menampilkan kategori ${TRANSACTION_KIND_LABELS[kind].toLowerCase()} saja.`}
        >
          <Select
            id="categoryId"
            name="categoryId"
            key={kind}
            defaultValue={transaction?.categoryId ?? ""}
            invalid={Boolean(errors?.categoryId)}
            required
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {visibleCategories.map((category) => (
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
          placeholder="Opsional"
          defaultValue={transaction?.notes ?? ""}
          maxLength={500}
        />
      </FormField>

      <div className="flex flex-wrap gap-2 border-t border-border pt-5">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Menyimpan…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => window.history.back()}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}