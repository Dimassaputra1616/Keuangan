import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTransaction } from "@/server/actions/transactions";
import {
  getActiveAccounts,
  getActiveCategories,
  getTransactionById,
} from "@/server/queries/finance";
import { formatDateLong } from "@/lib/date";
import { formatRupiah } from "@/lib/money";
import type { TransactionKind } from "@/lib/types";
import { IconArrowLeft } from "@/components/Icons";
import {
  TransactionForm,
  type AccountOption,
  type CategoryOption,
} from "@/components/transactions/TransactionForm";
import { Card, cx } from "@/components/ui";

export const metadata = { title: "Ubah Transaksi · Keuangan" };

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transaction = await getTransactionById(id);

  if (!transaction) notFound();

  const [accounts, categories] = await Promise.all([
    getActiveAccounts(),
    getActiveCategories(),
  ]);

  const accountOptions: AccountOption[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));

  const categoryOptions: CategoryOption[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    kind: category.kind as TransactionKind,
  }));

  // Kategori dan akun lama ikut ditampilkan walau sudah diarsipkan, supaya
  // nilai bawaan form tetap valid dan pengguna tidak kehilangan datanya.
  if (!categoryOptions.some((c) => c.id === transaction.categoryId)) {
    categoryOptions.push({
      id: transaction.categoryId,
      name: `${transaction.category.name} (diarsipkan)`,
      kind: transaction.kind as TransactionKind,
    });
  }

  if (!accountOptions.some((a) => a.id === transaction.accountId)) {
    accountOptions.push({
      id: transaction.accountId,
      name: `${transaction.account.name} (diarsipkan)`,
    });
  }

  const isIncome = transaction.kind === "INCOME";

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <header className="space-y-3">
        <Link
          href="/transaksi"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <IconArrowLeft className="h-4 w-4" />
          Kembali ke daftar
        </Link>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-subtle-foreground">
            Entri lama
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Ubah transaksi
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{formatDateLong(transaction.occurredAt)}</span>
            <span aria-hidden="true" className="text-subtle-foreground">·</span>
            <span
              className={cx(
                "font-semibold tabular-nums",
                isIncome ? "text-income" : "text-foreground",
              )}
            >
              {isIncome ? "+" : "−"}
              {formatRupiah(transaction.amount)}
            </span>
          </p>
        </div>
      </header>

      <Card className="p-5 sm:p-6">
        <TransactionForm
          action={updateTransaction}
          accounts={accountOptions}
          categories={categoryOptions}
          submitLabel="Simpan perubahan"
          transaction={{
            id: transaction.id,
            kind: transaction.kind as TransactionKind,
            amount: transaction.amount,
            occurredAt: transaction.occurredAt.toISOString(),
            description: transaction.description,
            notes: transaction.notes,
            accountId: transaction.accountId,
            categoryId: transaction.categoryId,
          }}
        />
      </Card>

      <p className="text-xs text-subtle-foreground">
        Penghapusan transaksi dilakukan dari{" "}
        <Link
          href="/transaksi"
          className="font-medium text-foreground underline underline-offset-2"
        >
          daftar transaksi
        </Link>
        .
      </p>
    </div>
  );
}