"use client";

import { cloneElement, isValidElement, useId, useState } from "react";
import type {
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { MAX_RUPIAH, formatInputAmount } from "@/lib/money";
import { cx } from "./Card";

const FIELD_STYLES = [
  "min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5",
  "text-sm text-foreground shadow-sm outline-none transition",
  "placeholder:text-subtle-foreground",
  "hover:border-muted-foreground/40",
  "focus:border-ring focus:ring-4 focus:ring-ring/10",
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground",
].join(" ");

const INVALID_STYLES =
  "border-destructive focus:border-destructive focus:ring-destructive/15";

/**
 * Pembungkus satu field: label, kontrol, pesan error, dan bantuan.
 *
 * `errors` berasal dari `result.errors` yang dikembalikan Server Action.
 */
export function FormField({
  label,
  htmlFor,
  errors,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  errors?: string[];
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const message = errors?.[0];

  // Satu id dipakai bersama untuk pesan dan bantuan, lalu disuntikkan ke
  // kontrol lewat `aria-describedby`. Tanpa ini pembaca layar hanya tahu
  // field-nya tidak valid, tapi tidak tahu apa yang salah.
  const describedById = useId();
  const hasMessage = Boolean(message);
  const hasHint = !hasMessage && Boolean(hint);

  const control =
    isValidElement(children) && (hasMessage || hasHint)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          "aria-describedby": describedById,
        })
      : children;

  return (
    <div className={cx("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-sm font-medium text-foreground"
      >
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
            <span className="sr-only">(wajib diisi)</span>
          </>
        ) : null}
      </label>
      {control}
      {/* `role="alert"` membacakan pesan begitu Server Action selesai, tanpa
          memindahkan fokus dari field yang sedang dikerjakan. */}
      {hasMessage ? (
        <p
          id={describedById}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {message}
        </p>
      ) : hasHint ? (
        <p id={describedById} className="text-xs text-subtle-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cx(FIELD_STYLES, invalid && INVALID_STYLES, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cx(
        FIELD_STYLES,
        "cursor-pointer appearance-none bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10",
        invalid && INVALID_STYLES,
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cx(
        FIELD_STYLES,
        "min-h-24 resize-y",
        invalid && INVALID_STYLES,
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

/**
 * Input nominal rupiah.
 *
 * Digit yang diketik langsung diformat dengan pemisah ribuan supaya angka
 * besar mudah dibaca (`1250000` menjadi `1.250.000`). Nilai yang dikirim ke
 * Server Action tetap digit murni dan dibersihkan oleh `parseRupiahInput()`.
 */
export function CurrencyInput({
  name,
  defaultValue,
  invalid,
  className,
  placeholder = "0",
  id,
  "aria-describedby": ariaDescribedBy,
}: {
  name: string;
  defaultValue?: number;
  invalid?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
  "aria-describedby"?: string;
}) {
  const [value, setValue] = useState(
    defaultValue ? formatInputAmount(defaultValue) : "",
  );

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-subtle-foreground">
        Rp
      </span>
      <input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        aria-describedby={ariaDescribedBy}
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          if (digits.length === 0) {
            setValue("");
            return;
          }
          const parsed = Number.parseInt(digits, 10);
          if (parsed > MAX_RUPIAH) return;
          setValue(formatInputAmount(parsed));
        }}
        className={cx(
          FIELD_STYLES,
          "py-2.5 pl-10 text-right text-base font-medium tabular-nums",
          invalid && INVALID_STYLES,
          className,
        )}
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}

/**
 * Input saldo awal yang boleh negatif, misalnya overdraft kartu kredit.
 *
 * Tanda minus boleh diketik di depan angka dan ikut terkirim apa adanya,
 * lalu dibersihkan oleh `parseSignedRupiahInput()`.
 */
export function SignedCurrencyInput({
  name,
  defaultValue,
  invalid,
  id,
  "aria-describedby": ariaDescribedBy,
}: {
  name: string;
  defaultValue?: number;
  invalid?: boolean;
  id?: string;
  "aria-describedby"?: string;
}) {
  const [value, setValue] = useState(
    defaultValue
      ? `${defaultValue < 0 ? "-" : ""}${formatInputAmount(Math.abs(defaultValue))}`
      : "",
  );

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-subtle-foreground">
        Rp
      </span>
      <input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        aria-describedby={ariaDescribedBy}
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          const negative = raw.trim().startsWith("-");
          const digits = raw.replace(/\D/g, "");
          if (digits.length === 0) {
            setValue(negative ? "-" : "");
            return;
          }
          const parsed = Number.parseInt(digits, 10);
          if (parsed > MAX_RUPIAH) return;
          setValue(`${negative ? "-" : ""}${formatInputAmount(parsed)}`);
        }}
        className={cx(
          FIELD_STYLES,
          "py-2.5 pl-10 text-right text-base font-medium tabular-nums",
          invalid && INVALID_STYLES,
        )}
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}

/** Pemilih warna untuk kategori, memakai input color bawaan browser. */
export function ColorInput({
  name,
  defaultValue,
  invalid,
  "aria-describedby": ariaDescribedBy,
}: {
  name: string;
  defaultValue: string;
  invalid?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <input
      type="color"
      name={name}
      defaultValue={defaultValue}
      aria-label="Warna kategori"
      aria-describedby={ariaDescribedBy}
      className={cx(
        "h-11 w-20 cursor-pointer rounded-xl border border-border bg-surface p-1.5 shadow-sm transition hover:border-muted-foreground/40",
        invalid && INVALID_STYLES,
      )}
    />
  );
}
