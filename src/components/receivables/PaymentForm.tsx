"use client";

import { useActionState, useEffect } from "react";
import type { ActionResult } from "@/lib/types";
import { getTodayInputValue } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
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
import type { SelectOption } from "./ReceivableForm";

const INITIAL_RESULT: ActionResult = { ok: false, message: "" };

/**
 * Form pencatatan pembayaran piutang.
 *
 * Server Action menegakkan batas atas: pembayaran tidak boleh melebihi sisa,
 * tanggal bayar tidak boleh mendahului tanggal pinjam, dan piutang yang sudah
 * dibatalkan atau lunas tidak menerima pembayaran baru.
 */
export function PaymentForm({
  action,
  receivableId,
  personName,
  remaining,
  lentAtDay,
  accounts,
  incomeCategories,
  defaultAccountId,
  defaultCategoryId,
  defaultAmount,
  onSuccess,
}: {
  action: (
    previous: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  receivableId: string;
  personName: string;
  remaining: number;
  lentAtDay: string;
  accounts: SelectOption[];
  incomeCategories: SelectOption[];
  defaultAccountId?: string;
  defaultCategoryId?: string;
  /** Nominal awal, dipakai saat menandai lunas agar terisi penuh. */
  defaultAmount?: number;
  /** Dipanggil sekali setelah Server Action berhasil. */
  onSuccess?: () => void;
}) {
  const [result, formAction, pending] = useActionState(action, INITIAL_RESULT);
  const errors = result.ok ? undefined : result.errors;

  useEffect(() => {
    if (result.ok) onSuccess?.();
    // `onSuccess` sengaja tidak jadi dependensi supaya tidak memicu ulang
    // saat parent membuat fungsi baru setiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="receivableId" value={receivableId} />

      {result.message ? (
        <Alert
          key={result.message}
          tone={result.ok ? "success" : "error"}
          duration={alertDuration(result)}
        >
          {result.message}
        </Alert>
      ) : null}

      <div className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">
          Sisa yang harus dilunasi
        </p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
          {formatRupiah(remaining)}
        </p>
        <p className="mt-0.5 text-xs text-subtle-foreground">
          Pinjamkan kepada {personName}. Pembayaran dicatat sebagai pemasukan di
          akun tujuan.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Nominal diterima"
          htmlFor="amount"
          required
          errors={errors?.amount}
          hint={`Maksimal ${formatRupiah(remaining)}.`}
        >
          <CurrencyInput
            name="amount"
            defaultValue={defaultAmount}
            invalid={Boolean(errors?.amount)}
          />
        </FormField>

        <FormField
          label="Tanggal diterima"
          htmlFor="receivedAt"
          required
          errors={errors?.receivedAt}
        >
          <Input
            id="receivedAt"
            name="receivedAt"
            type="date"
            defaultValue={getTodayInputValue()}
            min={lentAtDay}
            invalid={Boolean(errors?.receivedAt)}
            required
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Akun tujuan"
          htmlFor="accountId"
          required
          errors={errors?.accountId}
          hint="Rekening tempat uang masuk."
        >
          <Select
            id="accountId"
            name="accountId"
            defaultValue={defaultAccountId ?? ""}
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
            defaultValue={defaultCategoryId ?? ""}
            invalid={Boolean(errors?.categoryId)}
            required
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {incomeCategories.map((category) => (
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
          maxLength={500}
          className="min-h-20"
        />
      </FormField>

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Catat pembayaran"}
      </Button>
    </form>
  );
}