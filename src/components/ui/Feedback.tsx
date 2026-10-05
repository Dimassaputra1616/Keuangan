import type { ReactNode } from "react";
import { IconInbox } from "@/components/Icons";
import { cx } from "./Card";

/**
 * Keadaan kosong, misalnya bulan tanpa transaksi.
 *
 * Komponen ini tetap tanpa state sehingga bisa dipakai di Server Component.
 * Untuk notifikasi hasil aksi yang bisa hilang sendiri, lihat `./Alert.tsx`.
 */
export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-1.5 px-5 py-8" : "gap-2 px-5 py-14",
      )}
    >
      <span className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-surface-muted text-muted-foreground">
        <IconInbox className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="pt-3">{action}</div> : null}
    </div>
  );
}

/** Placeholder berkilau saat Server Component sedang mengambil data. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-shimmer rounded-lg bg-surface-muted", className)}
      aria-hidden="true"
    />
  );
}
