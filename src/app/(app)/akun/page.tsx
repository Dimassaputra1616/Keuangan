import Link from "next/link";
import { createAccount, updateAccount } from "@/server/actions/accounts";
import { getAccountBalances, getAccountsWithUsage } from "@/server/queries/finance";
import { formatRupiah } from "@/lib/money";
import {
  ACCOUNT_PURPOSE_LABELS,
  ACCOUNT_TYPE_LABELS,
  isAccountPurpose,
  isAccountType,
  type AccountPurpose,
  type AccountType,
} from "@/lib/types";
import { IconPlus, IconWallet } from "@/components/Icons";
import { AccountForm } from "@/components/accounts/AccountForm";
import {
  DeleteAccountButton,
  ToggleArchiveAccountButton,
} from "@/components/accounts/AccountActions";
import { Card, CardHeader, EmptyState, cx } from "@/components/ui";

export const metadata = { title: "Akun · Keuangan" };

// Halaman ini membaca data langsung dari SQLite, jadi tidak boleh di-prerender
// saat build. Tanpa baris ini, daftar akun ikut tertanam di HTML statis.
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [accounts, balances] = await Promise.all([
    getAccountsWithUsage(),
    // Uang di akun terarsip tetap milik pengguna, jadi saldonya tetap dihitung.
    getAccountBalances({ includeArchived: true }),
  ]);

  const balanceMap = new Map(balances.map((row) => [row.id, row.balance]));

  return (
    <div className="space-y-6 animate-fade-up">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-subtle-foreground">
         Aset dan dana
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Akun
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saldo setiap akun dihitung sebagai saldo awal + pemasukan −
          pengeluaran sepanjang waktu.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Card>
          <CardHeader
            title="Daftar akun"
            description={`${accounts.length} akun terdaftar`}
          />

          {accounts.length === 0 ? (
            <EmptyState
              title="Belum ada akun"
              description="Tambahkan akun pertama lewat formulir di samping."
            />
          ) : (
            <ul className="divide-y divide-border">
              {accounts.map((account) => {
                const balance = balanceMap.get(account.id);

                return (
                  <li key={account.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {/* `w-full` di layar kecil memaksa saldo turun ke baris
                          sendiri, jadi posisinya konsisten tidak bergantung pada
                          panjang nama akun. */}
                      <div className="flex w-full min-w-0 items-start gap-3 sm:w-auto sm:flex-1">
                        <span
                          className={cx(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                            account.isArchived
                              ? "bg-surface-muted text-subtle-foreground"
                              : "bg-primary text-primary-foreground",
                          )}
                        >
                          <IconWallet className="h-[1.15rem] w-[1.15rem]" />
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
                          <p className="mt-0.5 text-xs text-subtle-foreground">
                            {isAccountType(account.type)
                              ? ACCOUNT_TYPE_LABELS[account.type]
                              : account.type}{" "}
                            · Saldo awal {formatRupiah(account.initialBalance)} ·{" "}
                            {account.transactionCount} transaksi
                            </p>
                            {isAccountPurpose(account.purpose) ? (
                            <p className="mt-1 text-xs text-subtle-foreground">
                              Peran:{" "}
                              {ACCOUNT_PURPOSE_LABELS[account.purpose as AccountPurpose]}
                            </p>
                            ) : null}
                          </div>
                      </div>

                      <p
                        className={cx(
                          "text-base font-semibold tabular-nums",
                          (balance ?? 0) < 0 ? "text-expense" : "text-foreground",
                        )}
                      >
                        {formatRupiah(balance ?? 0)}
                      </p>
                    </div>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      <details className="w-full sm:w-auto">
                        <summary className="cursor-pointer rounded-lg px-1 py-0.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
                          Ubah data akun
                        </summary>
                        <div className="mt-3 rounded-xl border border-border bg-surface-muted p-4">
                          <AccountForm
                            action={updateAccount}
                            submitLabel="Simpan perubahan"
                            account={{
                              id: account.id,
                              name: account.name,
                              type: account.type as AccountType,
                              purpose: isAccountPurpose(account.purpose)
                                ? (account.purpose as AccountPurpose)
                                : null,
                              initialBalance: account.initialBalance,
                            }}
                          />
                        </div>
                      </details>

                      <div className="flex gap-2">
                        <ToggleArchiveAccountButton
                          id={account.id}
                          isArchived={account.isArchived}
                        />
                        <DeleteAccountButton
                          id={account.id}
                          name={account.name}
                          transactionCount={account.transactionCount}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader
            title="Tambah akun"
            description="Akun baru langsung bisa dipakai untuk mencatat transaksi."
          />
          <div className="p-5">
            <AccountForm action={createAccount} submitLabel="Tambah akun" />
            <p className="mt-4 border-t border-border pt-4 text-xs text-subtle-foreground">
              Ingin langsung mencatat transaksi?{" "}
              <Link
                href="/transaksi/baru"
                className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2"
              >
                <IconPlus className="h-3 w-3" />
                Buat transaksi
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}