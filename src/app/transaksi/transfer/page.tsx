import Link from "next/link";
import { getActiveAccounts } from "@/server/queries/finance";
import { getTransfers } from "@/server/queries/transfers";
import { createTransfer } from "@/server/actions/transfers";
import { formatDateShort } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import { IconArrowLeft, IconArrowRight } from "@/components/Icons";
import {
  TransferForm,
  type TransferAccountOption,
} from "@/components/transactions/TransferForm";
import { DeleteTransferButton } from "@/components/transactions/DeleteTransferButton";
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  buttonStyles,
  cx,
} from "@/components/ui";

export const metadata = { title: "Transfer · Keuangan" };

// Daftar akun dan transfer diambil dari database saat request.
export const dynamic = "force-dynamic";

export default async function TransferPage() {
  const [accounts, transfers] = await Promise.all([
    getActiveAccounts(),
    getTransfers(),
  ]);

  const accountOptions: TransferAccountOption[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <header className="space-y-3">
        <Link
          href="/transaksi"
          className={cx(
            "inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground",
          )}
        >
          <IconArrowLeft className="h-4 w-4" />
          Kembali ke transaksi
        </Link>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Transfer antar akun
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Memindahkan uang dari satu akun ke akun lain.
          </p>
        </div>
      </header>

      {/* Penjelasan ini penting: tanpa itu user mengira transfer akan menambah
          pemasukan, lalu kaget laporan bulanannya tidak berubah. */}
      <Alert tone="info">
        Transfer <strong>bukan pemasukan dan bukan pengeluaran</strong> — uangnya
        cuma pindah tempat. Jadi total kekayaan tetap sama dan laporan
        arus kas tidak berubah.
      </Alert>

      {accountOptions.length < 2 ? (
        <EmptyState
          title="Perlu minimal dua akun"
          description="Transfer memindahkan uang antar akun, jadi harus ada akun asal dan akun tujuan yang berbeda."
          action={
            <Link href="/akun" className={buttonStyles("primary", "sm")}>
              Kelola akun
            </Link>
          }
        />
      ) : (
        <Card padded>
          <TransferForm action={createTransfer} accounts={accountOptions} />
        </Card>
      )}

      {transfers.length > 0 ? (
        <Card>
          <CardHeader
            title="Riwayat transfer"
            description="Transfer tidak memengaruhi laporan pemasukan dan pengeluaran."
          />

          <ul className="divide-y divide-border/60">
            {transfers.map((transfer) => (
              <li
                key={transfer.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="truncate">{transfer.fromAccount.name}</span>
                    <IconArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-subtle-foreground"
                    />
                    <span className="truncate">{transfer.toAccount.name}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-subtle-foreground">
                    {formatDateShort(transfer.occurredAt)}
                    {transfer.notes ? ` · ${transfer.notes}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatRupiah(transfer.amount)}
                  </span>
                  <DeleteTransferButton
                    id={transfer.id}
                    description={`${transfer.fromAccount.name} ke ${transfer.toAccount.name} sebesar ${formatRupiah(transfer.amount)}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
