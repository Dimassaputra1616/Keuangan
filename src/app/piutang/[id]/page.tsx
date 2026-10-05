import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addPayment,
  updateReceivable,
} from "@/server/actions/receivables";
import { getReceivableById } from "@/server/queries/receivables";
import { getActiveAccounts, getActiveCategories } from "@/server/queries/finance";
import { formatDateLong, formatDateShort, toDateInputValue } from "@/lib/date";
import { formatRupiah, percentage } from "@/lib/money";
import {
  IconAlert,
  IconArrowLeft,
  IconCheck,
  IconPencil,
  IconReceipt,
} from "@/components/Icons";
import { ReceivableForm } from "@/components/receivables/ReceivableForm";
import { PaymentForm } from "@/components/receivables/PaymentForm";
import {
  DeletePaymentButton,
  DeleteReceivableButton,
  ToggleCancelReceivableButton,
} from "@/components/receivables/ReceivableActions";
import { Card, CardHeader, EmptyState, cx } from "@/components/ui";

export const metadata = { title: "Detail Piutang · Keuangan" };

export default async function ReceivableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [receivable, accounts, categories] = await Promise.all([
    getReceivableById(id),
    getActiveAccounts(),
    getActiveCategories(),
  ]);

  if (!receivable) notFound();

  const accountOptions = accounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));

  const expenseCategories = categories
    .filter((category) => category.kind === "EXPENSE")
    .map((category) => ({ id: category.id, name: category.name }));

  const incomeCategories = categories
    .filter((category) => category.kind === "INCOME")
    .map((category) => ({ id: category.id, name: category.name }));

  const defaultCategoryId = categories.find(
    (category) => category.kind === "INCOME" && category.name === "Piutang",
  )?.id;

  const defaultExpenseCategoryId = categories.find(
    (category) => category.kind === "EXPENSE" && category.name === "Piutang",
  )?.id;

  const defaultAccountId = accounts[0]?.id;
  const lentAtDay = toDateInputValue(receivable.lentAt);
  const paidShare = percentage(receivable.paidTotal, receivable.amount);
  const canReceivePayment =
    !receivable.isCancelled && receivable.remaining > 0 && incomeCategories.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
      <header className="space-y-3">
        <Link
          href="/piutang"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <IconArrowLeft className="h-4 w-4" />
          Kembali ke daftar piutang
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {receivable.personName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {receivable.title} · Dipinjamkan {formatDateLong(receivable.lentAt)}
              {receivable.dueAt
                ? ` · Jatuh tempo ${formatDateLong(receivable.dueAt)}`
                : " · Tanpa jatuh tempo"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ToggleCancelReceivableButton
              id={receivable.id}
              isCancelled={receivable.isCancelled}
              remaining={receivable.remaining}
            />
            <DeleteReceivableButton
              id={receivable.id}
              personName={receivable.personName}
              paymentCount={receivable.payments.length}
            />
          </div>
        </div>
      </header>

      {receivable.isOverdue ? (
        <Card className="flex items-start gap-3 border-l-4 border-l-expense p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-expense-soft text-expense">
            <IconAlert className="h-[1.15rem] w-[1.15rem]" />
          </span>
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Lewat jatuh tempo {Math.abs(receivable.daysToDue ?? 0)} hari
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Sisa yang harus ditagih{" "}
              <strong className="font-semibold text-foreground">
                {formatRupiah(receivable.remaining)}
              </strong>
              .
            </p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">
            Nominal pokok
          </p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
            {formatRupiah(receivable.amount)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">
            Sudah dibayar
          </p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-income">
            {formatRupiah(receivable.paidTotal)}
          </p>
          <p className="mt-1 text-xs text-subtle-foreground">
            {receivable.payments.length} kali pembayaran
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">
            Sisa
          </p>
          <p
            className={cx(
              "mt-1.5 text-xl font-semibold tabular-nums",
              receivable.isSettled ? "text-income" : "text-foreground",
            )}
          >
            {receivable.isSettled ? "Lunas" : formatRupiah(receivable.remaining)}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-income transition-[width] duration-500"
              style={{ width: `${Math.min(100, paidShare)}%` }}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Catat pembayaran"
            description="Otomatis membuat transaksi pemasukan di akun tujuan."
          />
          <div className="p-5">
            {receivable.isCancelled ? (
              <EmptyState
                compact
                title="Piutang sudah dibatalkan"
                description="Aktifkan kembali piutang untuk mencatat pembayaran."
              />
            ) : receivable.isSettled ? (
              <EmptyState
                compact
                title="Piutang sudah lunas"
                description="Seluruh nominal sudah dibayar oleh peminjam."
              />
            ) : !canReceivePayment ? (
              <EmptyState
                compact
                title="Belum ada kategori pemasukan"
                description="Tambahkan kategori pemasukan dulu sebelum mencatat pembayaran."
              />
            ) : (
              <PaymentForm
                action={addPayment}
                receivableId={receivable.id}
                personName={receivable.personName}
                remaining={receivable.remaining}
                lentAtDay={lentAtDay}
                accounts={accountOptions}
                incomeCategories={incomeCategories}
                defaultAccountId={defaultAccountId}
                defaultCategoryId={defaultCategoryId}
              />
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Riwayat pembayaran"
              description="Setiap pembayaran terhubung ke satu transaksi pemasukan."
            />
            {receivable.payments.length === 0 ? (
              <EmptyState
                compact
                title="Belum ada pembayaran"
                description="Riwayat akan muncul di sini setelah pembayaran dicatat."
              />
            ) : (
              <ul className="divide-y divide-border">
                {receivable.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-income-soft text-income">
                        <IconCheck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium tabular-nums text-foreground">
                          {formatRupiah(payment.amount)}
                        </p>
                        <p className="text-xs text-subtle-foreground">
                          {formatDateLong(payment.receivedAt)}
                          {payment.notes ? ` · ${payment.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <DeletePaymentButton
                      receivableId={receivable.id}
                      paymentId={payment.id}
                      amountLabel={formatRupiah(payment.amount)}
                      receivedAtLabel={formatDateShort(payment.receivedAt)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Ubah data piutang"
              description="Transaksi kas ikut diperbarui supaya tetap sinkron."
            />
            <div className="p-5">
              <details>
                <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
                  <IconPencil className="h-4 w-4" />
                  Buka formulir ubah
                </summary>
                <div className="mt-4">
                  <ReceivableForm
                    action={updateReceivable}
                    accounts={accountOptions}
                    expenseCategories={expenseCategories}
                    receivable={{
                      id: receivable.id,
                      personName: receivable.personName,
                      title: receivable.title,
                      amount: receivable.amount,
                      lentAt: receivable.lentAt.toISOString(),
                      dueAt: receivable.dueAt
                        ? toDateInputValue(receivable.dueAt)
                        : "",
                      notes: receivable.notes,
                      accountId:
                        receivable.lentAccountId ?? defaultAccountId ?? "",
                      categoryId:
                        receivable.lentCategoryId ?? defaultExpenseCategoryId ?? "",
                    }}
                    submitLabel="Simpan perubahan"
                  />
                </div>
              </details>

              <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs text-subtle-foreground">
                <IconReceipt className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Akun dan kategori pada formulir ubah akan diterapkan ke
                  transaksi kas yang terkait. Bila ingin memindahkan ke akun
                  lain, ubah lewat daftar transaksi agar riwayatnya jelas.
                </span>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}