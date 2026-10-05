import type { ButtonHTMLAttributes } from "react";
import { cx } from "./Card";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  // Highlight tipis di tepi atas memberi kesan tombol punya volume tanpa
  // perlu warna yang lebih gelap, sehingga tetap lembut.
  primary:
    "bg-linear-to-b from-primary-hover to-primary text-primary-foreground shadow-sm shadow-primary/25 hover:brightness-105 active:scale-[0.98]",
  secondary:
    "border border-border/80 bg-surface/80 text-foreground backdrop-blur-sm hover:bg-surface-hover active:scale-[0.98]",
  danger:
    "border border-destructive-border bg-surface/80 text-destructive backdrop-blur-sm hover:bg-destructive-soft active:scale-[0.98]",
  ghost: "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
};

/** Kelas tombol yang bisa dipakai ulang oleh `next/link`. */
export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
) {
  return cx(
    "inline-flex min-h-11 select-none cursor-pointer items-center justify-center rounded-xl font-medium",
    "transition duration-200",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-45",
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={cx(buttonStyles(variant, size), className)}
      {...props}
    />
  );
}
