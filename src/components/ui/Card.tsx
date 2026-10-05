import type { ReactNode } from "react";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  padded = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cx(
        // Garis dibuat lebih tipis dan buraman lebih kuat supaya kartu terasa
        // seperti permukaan kaca di atas latar, bukan kotak bertepi keras.
        "rounded-card border border-border/70 bg-surface/80 shadow-card backdrop-blur-md",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-surface-muted/30 px-5 py-4">
      <div>
        <h2 className="text-[0.95rem] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export type StatTone = "neutral" | "income" | "expense";

const TONE_STYLES: Record<
  StatTone,
  { value: string; chip: string; glow: string }
> = {
  neutral: {
    value: "text-foreground",
    chip: "bg-surface-muted text-muted-foreground",
    glow: "from-foreground/5",
  },
  income: {
    value: "text-income",
    chip: "bg-income-soft text-income",
    glow: "from-income/10",
  },
  expense: {
    value: "text-expense",
    chip: "bg-expense-soft text-expense",
    glow: "from-expense/10",
  },
};

/**
 * Kartu ringkasan angka untuk dashboard.
 *
 * Latar berupa gradien lembut yang berasal dari nada warna kartu, memberi
 * kedalaman tanpa membuat halaman terasa ramai.
 */
export function StatCard({
  label,
  value,
  tone = "neutral",
  hint,
  icon,
}: {
  label: string;
  value: string;
  tone?: StatTone;
  hint?: string;
  icon?: ReactNode;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className="group relative overflow-hidden rounded-card border border-border/70 bg-surface/80 p-5 shadow-card backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lifted">
      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute inset-0 bg-linear-to-br to-transparent",
          styles.glow,
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={cx(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
              styles.chip,
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      {/* `rp-amount` menjaga nominal rupiah tidak terbelah di tengah digit.
          `min-w-0` supaya kartu ini boleh menyusut di dalam grid sempit
          alih-alih memaksa halaman jadi bisa digeser ke samping. */}
      <p
        className={cx(
          "rp-amount relative mt-3 min-w-0 text-[clamp(1.25rem,5.5vw,1.5rem)] font-semibold tracking-tight tabular-nums",
          styles.value,
        )}
      >
        {value}
      </p>

      {hint ? (
        <p className="relative mt-1.5 text-xs text-subtle-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
