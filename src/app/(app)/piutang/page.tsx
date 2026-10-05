import Link from "next/link";
import { getReceivables, getReceivableSummary } from "@/server/queries/receivables";
import { getActiveAccounts, getActiveCategories } from "@/server/queries/finance";
import { formatDateLong, toDateInputValue } from "@/lib/date";
import { formatRupiah, percentage } from "@/lib/money";
import {
  countByFilter,
  filterReceivables,
  parseReceivableFilter,
  type ReceivableFilter,
} from "@/lib/receivable-rules";
import {
  IconAlert,
  IconArrowDown,
  IconCheck,
  IconPlus,
  IconReceivable,
} from "@/components/Icons";
import { LunasButton } from "@/components/receivables/LunasButton";
import type { SelectOption } from "@/components/receivables/ReceivableForm";
import { Card, EmptyState, StatCard, buttonStyles, cx } from "@/components/ui";
import type { ReceivableRow } from "@/server/queries/receivables";

export const metadata = { title: "Piutang · Keuangan" };

// Membaca langsung dari SQLite, jadi harus dirender pada setiap permintaan.
export const dynamic = "force-dynamic";

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = parseReceivableFilter(params.filter);

  const [allReceivables, accounts, categories] = await Promise.all([
    getReceivables(),
    getActiveAccounts(),
    getActiveCategories(),
  ]);

  const summary = await getReceivableSummary(allReceivables);
  const counts = countByFilter(allReceivables);
  const receivables = filterReceivables(allReceivables, filter);

  // Opsi untuk dialog "Lunas": daftar akun dan kategori pemasukan.
  const accountOptions: SelectOption[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));

  const incomeOptions: SelectOption[] = categories
    .filter((category) => category.kind === "INCOME")
    .map((category) => ({ id: category.id, name: category.name }));

  const defaultAccountId = accounts[0]?.id;
  const defaultCategoryId = categories.find(
    (category) => category.kind === "INCOME" && category.name === "Piutang",
  )?.id;

  const active = allReceivables.filter((row) => !row.isCancelled);
  const unsettled = active.filter((row) => !row.isSettled);

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-subtle-foreground">
            Uang dipinjamkan
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Piutang
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Uang yang kamu pinjamkan ke orang lain dan masih bisa ditagih.
          </p>
        </div>

        <Link href="/piutang/baru" className={buttonStyles("primary", "md")}>
          <IconPlus className="h-4 w-4" />
          Catat piutang
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total outstanding"
          value={formatRupiah(summary.totalOutstanding)}
          tone="neutral"
          hint={`${unsettled.length} piutang belum lunas`}
          icon={<IconReceivable className="h-[1.15rem] w-[1.15rem]" />}
        />
        <StatCard
          label="Lewat jatuh tempo"
          value={formatRupiah(summary.overdueAmount)}
          tone={summary.overdueCount > 0 ? "expense" : "neutral"}
          hint={`${summary.overdueCount} piutang terlambat`}
          icon={<IconAlert className="h-[1.15rem] w-[1.15rem]" />}
        />
        <StatCard
          label="Jatuh tempo 30 hari ke depan"
          value={formatRupiah(
            active
              .filter(
                (row) =>
                  !row.isSettled &&
                  row.daysToDue !== null &&
                  row.daysToDue >= 0 &&
                  row.daysToDue <= 30,
              )
              .reduce((sum, row) => sum + row.remaining, 0),
          )}
          tone="neutral"
          hint={`${summary.dueSoonCount} piutang`}
          icon={<IconArrowDown className="h-[1.15rem] w-[1.15rem]" />}
        />
        <Link
          href="/piutang?filter=lunas"
          aria-label="Lihat piutang yang sudah lunas"
          className="cursor-pointer rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <StatCard
            label="Sudah lunas"
            value={String(summary.settledCount)}
            tone="income"
            hint={`Klik untuk melihat · dari ${formatRupiah(summary.totalLent)} dipinjamkan`}
            icon={<IconCheck className="h-[1.15rem] w-[1.15rem]" />}
          />
        </Link>
      </div>

      <FilterBar filter={filter} counts={counts} />

      {/* Penjelasan akuntansi hanya relevan saat melihat piutang yang masih
          aktif. Di tab Lunas cuma memakan ruang sia-sia. */}
      {filter !== "lunas" ? (
      <Card className="flex flex-wrap items-start gap-3 border-l-4 border-l-warning p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
          <IconAlert className="h-[1.15rem] w-[1.15rem]" />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-foreground">
            Cara piutang dihitung di aplikasi ini
          </p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            Saat kamu mencatat piutang, sistem otomatis membuat{" "}
            <strong className="font-semibold text-foreground">
              pengeluaran
            </strong>{" "}
            sebesar nominal di akun sumber. Saat pembayaran diterima, tercatat
            sebagai{" "}
            <strong className="font-semibold text-foreground">pemasukan</strong>{" "}
            di akun tujuan. Jadi saldo kas kamu selalu akurat, dan sisa piutang
            di atas bisa dihitung ulang dari transaksi yang sama tanpa perlu
            angka yang disimpan terpisah.
          </p>
        </div>
      </Card>
      ) : null}

      {receivables.length === 0 ? (
        <Card>
          {allReceivables.length === 0 ? (
            <EmptyState
              title="Belum ada piutang"
              description="Kalau kamu pernah pinjemin uang ke siapa pun, catat di sini supaya tidak hilang catatan."
              action={
                <Link href="/piutang/baru" className={buttonStyles("secondary", "sm")}>
                  <IconPlus className="h-4 w-4" />
                  Catat piutang pertama
                </Link>
              }
            />
          ) : (
            <EmptyState
              title={
                filter === "lunas"
                  ? "Belum ada piutang yang lunas"
                  : "Tidak ada piutang yang perlu ditagih"
              }
              description={
                filter === "lunas"
                  ? "Piutang yang sudah dibayar penuh akan muncul di sini."
                  : "Semua piutang sudah lunas atau dibatalkan. Lihat tab Lunas untuk riwayatnya."
              }
              action={
                filter !== "lunas" ? (
                  <Link href="/piutang?filter=lunas" className={buttonStyles("secondary", "sm")}>
                    <IconCheck className="h-4 w-4" />
                    Lihat yang sudah lunas
                  </Link>
                ) : undefined
              }
            />
          )}
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {receivables.map((row) => (
              <ReceivableListItem
                key={row.id}
                row={row}
                accounts={accountOptions}
                incomeCategories={incomeOptions}
                defaultAccountId={defaultAccountId}
                defaultCategoryId={defaultCategoryId}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

const FILTERS: Array<{ key: ReceivableFilter; label: string }> = [
  { key: "aktif", label: "Perlu ditagih" },
  { key: "lunas", label: "Lunas" },
  { key: "semua", label: "Semua" },
];

/**
 * Saringan daftar. Berupa tautan biasa, bukan tombol JavaScript, jadi pilihan
 * filter tersimpan di URL dan bisa di-bookmark atau dibagikan.
 */
function FilterBar({
  filter,
  counts,
}: {
  filter: ReceivableFilter;
  counts: Record<ReceivableFilter, number>;
}) {
  return (
    <div
      role="group"
      aria-label="Saring daftar piutang"
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1"
    >
      {FILTERS.map((item) => {
        const isActive = filter === item.key;

        return (
          <Link
            key={item.key}
            href={item.key === "aktif" ? "/piutang" : `/piutang?filter=${item.key}`}
            aria-current={isActive ? "true" : undefined}
            className={cx(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {item.label}
            <span
              className={cx(
                "ml-1.5 tabular-nums",
                isActive ? "opacity-80" : "text-subtle-foreground",
              )}
            >
              {counts[item.key]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function ReceivableListItem({
  row,
  accounts,
  incomeCategories,
  defaultAccountId,
  defaultCategoryId,
}: {
  row: ReceivableRow;
  accounts: SelectOption[];
  incomeCategories: SelectOption[];
  defaultAccountId?: string;
  defaultCategoryId?: string;
}) {
  const paidShare = percentage(row.paidTotal, row.amount);
  const canSettle = !row.isSettled && !row.isCancelled && row.remaining > 0;

  return (
    <li className={cx("px-5 py-4 transition hover:bg-surface-hover", row.isCancelled && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              row.isOverdue
                ? "bg-expense-soft text-expense"
                : row.isSettled
                  ? "bg-income-soft text-income"
                  : "bg-surface-muted text-muted-foreground",
            )}
          >
            {row.isSettled ? (
              <IconCheck className="h-[1.15rem] w-[1.15rem]" />
            ) : (
              <IconReceivable className="h-[1.15rem] w-[1.15rem]" />
            )}
          </span>

          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
              {row.personName}
              <StatusBadge row={row} />
            </p>
            <p className="mt-0.5 text-xs text-subtle-foreground">
              {row.title} · Dipinjam {formatDateLong(row.lentAt)}
            </p>
            {row.dueAt ? (
              <p
                className={cx(
                  "mt-0.5 text-xs",
                  row.isOverdue ? "font-medium text-expense" : "text-subtle-foreground",
                )}
              >
                Jatuh tempo {formatDateLong(row.dueAt)}
                {row.isOverdue ? ` · terlambat ${Math.abs(row.daysToDue ?? 0)} hari` : null}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-subtle-foreground">
                Tanpa jatuh tempo
              </p>
            )}
          </div>
        </div>

        <div className="text-right">
          <p
            className={cx(
              "text-base font-semibold tabular-nums",
              row.isSettled
                ? "text-income"
                : row.isCancelled
                  ? "text-subtle-foreground"
                  : "text-foreground",
            )}
          >
            {row.isSettled ? "Lunas" : formatRupiah(row.remaining)}
          </p>
          <p className="mt-0.5 text-xs text-subtle-foreground">
            dari {formatRupiah(row.amount)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-income transition-[width] duration-500"
            style={{ width: `${Math.min(100, paidShare)}%` }}
          />
        </div>
        <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums text-subtle-foreground">
          {paidShare}%
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {canSettle ? (
            <LunasButton
              receivableId={row.id}
              personName={row.personName}
              remaining={row.remaining}
              lentAtDay={toDateInputValue(row.lentAt)}
              accounts={accounts}
              incomeCategories={incomeCategories}
              defaultAccountId={defaultAccountId}
              defaultCategoryId={defaultCategoryId}
            />
          ) : null}
          <Link
            href={`/piutang/${row.id}`}
            className={buttonStyles("secondary", "sm")}
          >
            Detail
          </Link>
        </div>
      </div>
    </li>
  );
}

function StatusBadge({ row }: { row: ReceivableRow }) {
  if (row.isCancelled) {
    return (
      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
        Dibatalkan
      </span>
    );
  }

  if (row.isOverdue) {
    return (
      <span className="rounded-full bg-expense-soft px-2 py-0.5 text-xs font-medium text-expense">
        Terlambat
      </span>
    );
  }

  if (row.isSettled) {
    return (
      <span className="rounded-full bg-income-soft px-2 py-0.5 text-xs font-medium text-income">
        Lunas
      </span>
    );
  }

  return (
    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
      Belum lunas
    </span>
  );
}