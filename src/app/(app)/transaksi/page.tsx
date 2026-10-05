import Link from "next/link";
import {
  DEFAULT_PAGE_SIZE,
  getActiveAccounts,
  getActiveCategories,
  getTransactions,
} from "@/server/queries/finance";
import {
  formatDateShort,
  formatMonthLabel,
  normalizeMonthKey,
} from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import {
  TRANSACTION_KINDS,
  TRANSACTION_KIND_LABELS,
  isTransactionKind,
  type TransactionKind,
} from "@/lib/types";
import { IconPencil, IconPlus, IconSearch } from "@/components/Icons";
import {
  Card,
  EmptyState,
  FormField,
  Input,
  Select,
  buttonStyles,
  cx,
} from "@/components/ui";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Susun query string sambil mempertahankan filter yang lain. */
function buildHref(base: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const monthKey = normalizeMonthKey(first(params.bulan));
  const kindParam = first(params.jenis);
  const kind = isTransactionKind(kindParam)
    ? (kindParam as TransactionKind)
    : undefined;
  const categoryId = first(params.kategori) || undefined;
  const accountId = first(params.akun) || undefined;
  const keyword = first(params.q) || undefined;
  const page = Math.max(1, Number.parseInt(first(params.halaman), 10) || 1);

  const [result, accounts, categories] = await Promise.all([
    getTransactions({ monthKey, kind, categoryId, accountId, keyword, page }),
    getActiveAccounts(),
    getActiveCategories(),
  ]);

  const activeFilters = {
    bulan: monthKey,
    jenis: kindParam,
    kategori: categoryId ?? "",
    akun: accountId ?? "",
    q: keyword ?? "",
  };

  const pageIncome = result.items.reduce(
    (sum, item) => (item.kind === "INCOME" ? sum + item.amount : sum),
    0,
  );
  const pageExpense = result.items.reduce(
    (sum, item) => (item.kind === "EXPENSE" ? sum + item.amount : sum),
    0,
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-subtle-foreground">
            Riwayat
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Transaksi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMonthLabel(monthKey)} · {result.total} transaksi ditemukan
          </p>
        </div>

        <Link href="/transaksi/baru" className={buttonStyles("primary", "md")}>
          <IconPlus className="h-4 w-4" />
          Catat transaksi
        </Link>
      </header>

      <Card className="p-5">
        <form
          method="get"
          action="/transaksi"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
        >
          <FormField label="Bulan" htmlFor="bulan">
            <Input id="bulan" name="bulan" type="month" defaultValue={monthKey} />
          </FormField>

          <FormField label="Jenis" htmlFor="jenis">
            <Select id="jenis" name="jenis" defaultValue={kindParam}>
              <option value="">Semua jenis</option>
              {TRANSACTION_KINDS.map((option) => (
                <option key={option} value={option}>
                  {TRANSACTION_KIND_LABELS[option]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Kategori" htmlFor="kategori">
            <Select id="kategori" name="kategori" defaultValue={categoryId ?? ""}>
              <option value="">Semua kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Akun" htmlFor="akun">
            <Select id="akun" name="akun" defaultValue={accountId ?? ""}>
              <option value="">Semua akun</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Cari keterangan" htmlFor="q" className="lg:col-span-2">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
              <Input
                id="q"
                name="q"
                type="search"
                placeholder="Kata kunci pada keterangan"
                defaultValue={keyword ?? ""}
                className="pl-10"
              />
            </div>
          </FormField>

          <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
            <button type="submit" className={buttonStyles("primary", "sm")}>
              <IconSearch className="h-4 w-4" />
              Terapkan filter
            </button>
            <Link href="/transaksi" className={buttonStyles("secondary", "sm")}>
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5 text-sm">
          <p className="text-muted-foreground">
            Pada halaman ini: pemasukan{" "}
            <span className="font-semibold tabular-nums text-income">
              {formatRupiah(pageIncome)}
            </span>
            <span className="mx-1.5 text-subtle-foreground">·</span>
            pengeluaran{" "}
            <span className="font-semibold tabular-nums text-expense">
              {formatRupiah(pageExpense)}
            </span>
          </p>
          <p className="text-xs text-subtle-foreground">
            Halaman {result.page} dari {result.totalPages}
          </p>
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title="Tidak ada transaksi yang cocok"
            description="Coba ubah filter, atau catat transaksi baru untuk bulan ini."
            action={
              <Link
                href="/transaksi/baru"
                className={buttonStyles("secondary", "sm")}
              >
                <IconPlus className="h-4 w-4" />
                Catat transaksi
              </Link>
            }
          />
        ) : (
          <>
            {/*
              Layar kecil memakai daftar kartu, bukan tabel. Tabel enam kolom
              tidak muat di 360px: kolom Aksi terdorong keluar layar dan kolom
              Keterangan tergencet sampai teksnya pecah jadi banyak baris.
            */}
            <ul className="divide-y divide-border md:hidden">
              {result.items.map((transaction) => (
                <li key={transaction.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {transaction.description}
                      </p>
                      <p className="mt-0.5 text-xs text-subtle-foreground">
                        {formatDateShort(transaction.occurredAt)}
                        {transaction.notes ? ` · ${transaction.notes}` : ""}
                      </p>
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
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: transaction.category.color }}
                      />
                      <span className="truncate">
                        {transaction.category.name} · {transaction.account.name}
                      </span>
                    </span>

                    <div className="flex shrink-0 gap-1.5">
                      <Link
                        href={`/transaksi/${transaction.id}/edit`}
                        aria-label={`Ubah transaksi ${transaction.description}`}
                        title="Ubah"
                        className={buttonStyles("secondary", "sm")}
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Ubah</span>
                      </Link>
                      <DeleteTransactionButton
                        id={transaction.id}
                        description={transaction.description}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tabel penuh hanya di layar md ke atas. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-subtle-foreground">
                    <th scope="col" className="px-5 py-3 font-medium">
                      Tanggal
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Keterangan
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Kategori
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Akun
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">
                      Nominal
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.items.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-surface-hover"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                        {formatDateShort(transaction.occurredAt)}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium text-foreground">
                          {transaction.description}
                        </p>
                        {transaction.notes ? (
                          <p className="mt-0.5 text-xs text-subtle-foreground">
                            {transaction.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: transaction.category.color }}
                          />
                          <span className="text-muted-foreground">
                            {transaction.category.name}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-muted-foreground">
                        {transaction.account.name}
                      </td>
                      <td
                        className={cx(
                          "whitespace-nowrap px-3 py-3.5 text-right font-semibold tabular-nums",
                          transaction.kind === "INCOME"
                            ? "text-income"
                            : "text-foreground",
                        )}
                      >
                        {transaction.kind === "INCOME" ? "+" : "−"}
                        {formatRupiah(transaction.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/transaksi/${transaction.id}/edit`}
                            className={buttonStyles("secondary", "sm")}
                          >
                            <IconPencil className="h-3.5 w-3.5" />
                            Ubah
                          </Link>
                          <DeleteTransactionButton
                            id={transaction.id}
                            description={transaction.description}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result.totalPages > 1 ? (
          <nav
            aria-label="Paginasi"
            className="flex items-center justify-between gap-2 border-t border-border px-5 py-3.5"
          >
            {result.page > 1 ? (
              <Link
                href={buildHref("/transaksi", {
                  ...activeFilters,
                  halaman: String(result.page - 1),
                })}
                className={buttonStyles("secondary", "sm")}
              >
                Sebelumnya
              </Link>
            ) : (
              <span />
            )}

            <span className="text-xs text-subtle-foreground">
              {result.page} / {result.totalPages} · {DEFAULT_PAGE_SIZE} per halaman
            </span>

            {result.page < result.totalPages ? (
              <Link
                href={buildHref("/transaksi", {
                  ...activeFilters,
                  halaman: String(result.page + 1),
                })}
                className={buttonStyles("secondary", "sm")}
              >
                Berikutnya
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Card>
    </div>
  );
}