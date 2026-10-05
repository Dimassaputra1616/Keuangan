"use client";

import { useActionState } from "react";
import {
  TRANSACTION_KINDS,
  TRANSACTION_KIND_LABELS,
  type ActionResult,
  type TransactionKind,
} from "@/lib/types";
import { IconArrowDown, IconArrowUp } from "@/components/Icons";
import {
  Alert,
  alertDuration,
  Button,
  ColorInput,
  FormField,
  Input,
  cx,
} from "@/components/ui";

const INITIAL_RESULT: ActionResult = { ok: false, message: "" };

const PRESET_COLORS = [
  "#f97316",
  "#0ea5e9",
  "#6366f1",
  "#ec4899",
  "#a855f7",
  "#14b8a6",
  "#3b82f6",
  "#22c55e",
  "#ca8a04",
  "#64748b",
];

export type CategoryDefaults = {
  id: string;
  name: string;
  kind: TransactionKind;
  color: string;
};

/** Form tambah atau ubah kategori. */
export function CategoryForm({
  action,
  category,
  submitLabel,
}: {
  action: (
    previous: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  category?: CategoryDefaults;
  submitLabel: string;
}) {
  const [result, formAction, pending] = useActionState(action, INITIAL_RESULT);
  const errors = result.ok ? undefined : result.errors;
  const currentKind = category?.kind ?? "EXPENSE";

  return (
    <form action={formAction} className="space-y-5">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      {result.message ? (
        <Alert
          key={result.message}
          tone={result.ok ? "success" : "error"}
          duration={alertDuration(result)}
        >
          {result.message}
        </Alert>
      ) : null}

      <FormField label="Nama kategori" htmlFor="name" required errors={errors?.name}>
        <Input
          id="name"
          name="name"
          defaultValue={category?.name}
          placeholder="Contoh: Makan & Minum"
          invalid={Boolean(errors?.name)}
          maxLength={50}
          required
        />
      </FormField>

      <fieldset>
        <legend className="mb-2 flex items-center gap-1 text-sm font-medium text-foreground">
          Jenis
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRANSACTION_KINDS.map((option) => {
            const isIncome = option === "INCOME";
            const Icon = isIncome ? IconArrowDown : IconArrowUp;

            return (
              <label
                key={option}
                className={cx(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition",
                  currentKind === option
                    ? "border-ring bg-surface font-medium text-foreground shadow-sm"
                    : "border-border text-muted-foreground hover:bg-surface-hover",
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={option}
                  defaultChecked={currentKind === option}
                  className="sr-only"
                />
                <span
                  className={cx(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                    isIncome
                      ? "bg-income-soft text-income"
                      : "bg-expense-soft text-expense",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {TRANSACTION_KIND_LABELS[option]}
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

      <FormField
        label="Warna"
        htmlFor="color"
        errors={errors?.color}
        hint="Dipakai untuk bar kategori di dashboard."
      >
        <div className="flex flex-wrap items-center gap-3">
          <ColorInput
            name="color"
            defaultValue={category?.color ?? "#64748b"}
            invalid={Boolean(errors?.color)}
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((color) => (
              <span
                key={color}
                aria-hidden="true"
                title={color}
                className="h-6 w-6 rounded-lg ring-1 ring-border"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </FormField>

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : submitLabel}
      </Button>
    </form>
  );
}