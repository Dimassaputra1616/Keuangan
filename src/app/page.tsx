import Link from "next/link";
import {
  getAccountBalances,
  getCategoryBreakdown,
  getMonthSummary,
  getRecentTransactions,
} from "@/server/queries/finance";
import {
  getReceivableFlow,
  getReceivableSummary,
} from "@/server/queries/receivables";
import { getWealthSummary } from "@/server/queries/wealth";
import {
  formatDateShort,
  formatMonthLabel,
  getCurrentMonthKey,
  normalizeMonthKey,
  shiftMonth,
} from "@/lib/date";
import { formatRupiah, percentage } from "@/lib/money";
import { ACCOUNT_TYPE_LABELS, isAccountType } from "@/lib/types";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconPlus,
  IconReceivable,
  IconScale,
  IconWallet,
} from "@/components/Icons";
import { WealthCard } from "@/components/WealthCard";
import {
  Card,
  CardHeader,
  EmptyState,
  StatCard,
  buttonStyles,
  cx,
} from "@/components/ui";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const params = await searchParams;
  const monthKey = normalizeMonthKey(params.bulan);
  const currentMonth = getCurrentMonthKey();

  const [
    summary,
    expenseBreakdown,
    incomeBreakdown,
    accounts,
    recent,
    flow,
    piutang,
    wealth,
  ] = await Promise.all([
    getMonthSummary(monthKey),
    getCategoryBreakdown(monthKey, "EXPENSE"),
    getCategoryBreakdown(monthKey, "INCOME"),
    // Akun terarsip ikut diambil agar angka saldonya bisa diaudit di bawah.
    getAccountBalances({ includeArchived: true }),
    getRecentTransactions(5),
    getReceivableFlow(monthKey),
    getReceivableSummary(),
    getWealthSummary(),
  ]);

  const maxFlow = Math.max(summary.income, summary.expense, 1);
  const realExpense = summary.expense - flow.lent;

  // Akun aktif didahulukan, akun terarsip ditaruh paling bawah.
  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <WealthCard
        wealth={wealth}
        overdueCount={piutang.overdueCount}
        overdueAmount={piutang.overdueAmount}
      />

      <header className="flex flex-wrap items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-subtle-foreground">
            Ringkasan bulanan
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {formatMonthLabel(monthKey)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {monthKey === currentMonth
              ? "Bulan berjalan"
              : `Bukan bulan berjalan (sekarang ${formatMonthLabel(currentMonth)})`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MonthLink
            monthKey={shiftMonth(monthKey, -1)}
            label="Bulan lalu"
            icon={<IconArrowLeft className="h-4 w-4" />}
          />
          {monthKey !== currentMonth ? (
            <Link href="/" className={buttonStyles("secondary", "sm")}>
              Bulan ini
            </Link>
          ) : null}
          <MonthLink
            monthKey={shiftMonth(monthKey, 1)}
            label="Bulan depan"
            icon={<IconArrowRight className="h-4 w-4" />}
          />
          <Link href="/transaksi/baru" className={buttonStyles("primary", "sm")}>
            <IconPlus className="h-4 w-4" />
            Transaksi
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Pemasukan"
          value={formatRupiah(summary.income)}
          tone="income"
          hint={`${summary.transactionCount} transaksi bulan ini`}
          icon={<IconArrowDown className="h-[1.15rem] w-[1.15rem]" />}
        />
        <StatCard
          label="Pengeluaran"
          value={formatRupiah(summary.expense)}
          tone="expense"
          hint={
            flow.lent > 0
              ? `Setelah dikurangi ${formatRupiah(flow.lent)} piutang`
              : undefined
          }
          icon={<IconArrowUp className="h-[1.15rem] w-[1.15rem]" />}
        />
        <StatCard
          label="Selisih bulan ini"
          value={formatRupiah(summary.net)}
          tone={summary.net >= 0 ? "income" : "expense"}
          hint={
            flow.lent > 0
              ? `Pengeluaran riil ${formatRupiah(realExpense)}`
              : `Saldo seluruh akun ${formatRupiah(wealth.cash)}`
          }
          icon={<IconScale className="h-[1.15rem] w-[1.15rem]" />}
        />
      </div>

      {flow.lent > 0 ? (
        <Card className="flex items-start gap-3 border-l-4 border-l-warning p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
            <IconReceivable className="h-[1.15rem] w-[1.15rem]" />
          </span>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
            Pengeluaran bulan ini memuat{" "}
            <strong className="font-semibold text-foreground">
              {formatRupiah(flow.lent)}
            </strong>{" "}
            yang sebenarnya uang dipinjamkan, bukan dibelanjakan, jadi pengeluaran
            riilnya{" "}
            <strong className="font-semibold text-foreground">
              {formatRupiah(realExpense)}
            </strong>
            .{" "}
            {flow.repaid > 0 ? (
              <>
                Bulan ini juga menerima{" "}
                <strong className="font-semibold text-foreground">
                  {formatRupiah(flow.repaid)}
                </strong>{" "}
                pembayaran piutang.{" "}
              </>
            ) : null}
            <Link
              href="/piutang"
              className="cursor-pointer font-medium text-foreground underline underline-offset-2"
            >
              Lihat piutang
            </Link>
            .
          </p>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Perbandingan arus kas"
          description="Pemasukan dan pengeluaran bulan terpilih."
        />
        <div className="space-y-4 p-5">
          <FlowBar
            label="Pemasukan"
            value={summary.income}
            max={maxFlow}
            barClass="bg-income"
            textClass="text-income"
          />
          <FlowBar
            label="Pengeluaran"
            value={summary.expense}
            max={maxFlow}
            barClass="bg-expense"
            textClass="text-expense"
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Pengeluaran per kategori"
          rows={expenseBreakdown}
          emptyText="Belum ada pengeluaran pada bulan ini."
          emptyAction={
            <Link href="/transaksi/baru" className={buttonStyles("secondary", "sm")}>
              Catat pengeluaran pertama
            </Link>
          }
        />
        <BreakdownCard
          title="Pemasukan per kategori"
          rows={incomeBreakdown}
          emptyText="Belum ada pemasukan pada bulan ini."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Saldo akun"
            description={`${wealth.accountCount} akun, termasuk ${
              wealth.archivedCount > 0 ? `${wealth.archivedCount} terarsip` : "tanpa arsip"
            } · total ${formatRupiah(wealth.cash)}`}
          />
          {sortedAccounts.length === 0 ? (
            <EmptyState
              compact
              title="Belum ada akun"
              description="Tambahkan akun untuk mulai mencatat transaksi."
              action={
                <Link href="/akun" className={buttonStyles("secondary", "sm")}>
                  Kelola akun
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {sortedAccounts.map((account) => (
                <li
                  key={account.id}
                  className={cx(
                    "flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-surface-hover",
                    account.isArchived && "opacity-60",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-muted-foreground">
                      <IconWallet className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                        {account.name}
                        {account.isArchived ? (
                          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                            Diarsipkan
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-subtle-foreground">
                        {isAccountType(account.type)
                          ? ACCOUNT_TYPE_LABELS[account.type]
                          : account.type}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cx(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      account.balance < 0 ? "text-expense" : "text-foreground",
                    )}
                  >
                    {formatRupiah(account.balance)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Transaksi terbaru"
            action={
              <Link href="/transaksi" className={buttonStyles("ghost", "sm")}>
                Lihat semua
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              compact
              title="Belum ada transaksi"
              description="Transaksi yang dicatat akan muncul di sini."
              action={
                <Link href="/transaksi/baru" className={buttonStyles("secondary", "sm")}>
                  Catat transaksi
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((transaction) => (
                <li key={transaction.id}>
                  <Link
                    href={`/transaksi/${transaction.id}/edit`}
                    className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-surface-hover"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="h-9 w-1 shrink-0 rounded-full"
                        style={{
                          backgroundColor: transaction.category.color,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {transaction.description}
                        </p>
                        <p className="truncate text-xs text-subtle-foreground">
                          {transaction.category.name} · {transaction.account.name}{" "}
                          · {formatDateShort(transaction.occurredAt)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cx(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        transaction.kind === "INCOME"
                          ? "text-income"
                          : "text-foreground",
                      )}
                    >
                      {transaction.kind === "INCOME" ? "+" : "−"}
                      {formatRupiah(transaction.amount)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function MonthLink({
  monthKey,
  label,
  icon,
}: {
  monthKey: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={`/?bulan=${monthKey}`}
      aria-label={label}
      title={label}
      className={buttonStyles("secondary", "sm")}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function FlowBar({
  label,
  value,
  max,
  barClass,
  textClass,
}: {
  label: string;
  value: number;
  max: number;
  barClass: string;
  textClass: string;
}) {
  const share = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className={cx("font-semibold tabular-nums", textClass)}>
          {formatRupiah(value)}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cx(
            "animate-grow h-full origin-left rounded-full transition-[width] duration-700",
            barClass,
          )}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}

type BreakdownRow = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  count: number;
};

function BreakdownCard({
  title,
  rows,
  emptyText,
  emptyAction,
}: {
  title: string;
  rows: BreakdownRow[];
  emptyText: string;
  emptyAction?: React.ReactNode;
}) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <Card>
      <CardHeader title={title} description={`Total ${formatRupiah(total)}`} />
      {rows.length === 0 ? (
        <EmptyState compact title={emptyText} action={emptyAction} />
      ) : (
        <ul className="space-y-4 p-5">
          {rows.map((row) => (
            <li key={row.categoryId}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate font-medium text-foreground">
                    {row.name}
                  </span>
                  <span className="shrink-0 text-xs text-subtle-foreground">
                    {row.count} kali
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {formatRupiah(row.total)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="animate-grow h-full origin-left rounded-full transition-[width] duration-700"
                    style={{
                      width: `${percentage(row.total, total)}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-subtle-foreground">
                  {percentage(row.total, total)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}