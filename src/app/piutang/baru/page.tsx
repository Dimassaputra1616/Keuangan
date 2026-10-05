import Link from "next/link";
import { createReceivable } from "@/server/actions/receivables";
import { getActiveAccounts, getActiveCategories } from "@/server/queries/finance";
import { IconArrowLeft } from "@/components/Icons";
import { ReceivableForm } from "@/components/receivables/ReceivableForm";
import { Card, EmptyState, buttonStyles } from "@/components/ui";

export const metadata = { title: "Catat Piutang · Keuangan" };

// Daftar akun dan kategori diambil dari database saat request.
export const dynamic = "force-dynamic";

export default async function NewReceivablePage() {
  const [accounts, categories] = await Promise.all([
    getActiveAccounts(),
    getActiveCategories(),
  ]);

  const accountOptions = accounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));

  const expenseCategories = categories
    .filter((category) => category.kind === "EXPENSE")
    .map((category) => ({ id: category.id, name: category.name }));

  const defaultAccountId = accounts[0]?.id;
  const defaultCategoryId =
    categories.find((category) => category.kind === "EXPENSE" && category.name === "Piutang")
      ?.id ?? expenseCategories[0]?.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <header className="space-y-3">
        <Link
          href="/piutang"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <IconArrowLeft className="h-4 w-4" />
          Kembali ke daftar piutang
        </Link>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-subtle-foreground">
            Entri baru
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Catat piutang
          </h1>
        </div>
      </header>

      <Card className="p-5 sm:p-6">
        {accounts.length === 0 || expenseCategories.length === 0 ? (
          <EmptyState
            title="Data pendukung belum lengkap"
            description={
              accounts.length === 0
                ? "Minimal satu akun diperlukan sebelum mencatat piutang."
                : "Minimal satu kategori pengeluaran diperlukan sebelum mencatat piutang."
            }
            action={
              <div className="flex gap-2">
                {accounts.length === 0 ? (
                  <Link href="/akun" className={buttonStyles("secondary", "sm")}>
                    Tambah akun
                  </Link>
                ) : null}
                {expenseCategories.length === 0 ? (
                  <Link href="/kategori" className={buttonStyles("secondary", "sm")}>
                    Tambah kategori
                  </Link>
                ) : null}
              </div>
            }
          />
        ) : (
          <>
            <p className="mb-5 rounded-xl border border-border bg-surface-muted p-4 text-sm leading-relaxed text-muted-foreground">
              Setelah disimpan, sistem otomatis membuat transaksi{" "}
              <strong className="font-semibold text-foreground">
                pengeluaran
              </strong>{" "}
              sebesar nominal di akun yang kamu pilih, supaya saldo kas tetap
              akurat.
            </p>

            <ReceivableForm
              action={createReceivable}
              accounts={accountOptions}
              expenseCategories={expenseCategories}
              defaultAccountId={defaultAccountId}
              defaultCategoryId={defaultCategoryId}
              submitLabel="Simpan piutang"
            />
          </>
        )}
      </Card>
    </div>
  );
}