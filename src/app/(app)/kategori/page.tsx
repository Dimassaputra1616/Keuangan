import Link from "next/link";
import { createCategory, updateCategory } from "@/server/actions/categories";
import { getCategoriesWithUsage } from "@/server/queries/finance";
import {
  TRANSACTION_KINDS,
  TRANSACTION_KIND_LABELS,
  type TransactionKind,
} from "@/lib/types";
import { IconCategory } from "@/components/Icons";
import { CategoryForm } from "@/components/categories/CategoryForm";
import {
  DeleteCategoryButton,
  ToggleArchiveCategoryButton,
} from "@/components/categories/CategoryActions";
import { Card, CardHeader, EmptyState, cx } from "@/components/ui";

export const metadata = { title: "Kategori · Keuangan" };

// Membaca langsung dari SQLite, jadi harus dirender pada setiap permintaan.
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategoriesWithUsage();

  return (
    <div className="space-y-6 animate-fade-up">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-subtle-foreground">
          Pengelompokan
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Kategori
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kategori pemasukan dan pengeluaran dipisahkan agar laporan mudah dibaca.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          {TRANSACTION_KINDS.map((kind) => {
            const rows = categories.filter((category) => category.kind === kind);

            return (
              <Card key={kind}>
                <CardHeader
                  title={TRANSACTION_KIND_LABELS[kind]}
                  description={`${rows.length} kategori`}
                />

                {rows.length === 0 ? (
                  <EmptyState
                    compact
                    title={`Belum ada kategori ${TRANSACTION_KIND_LABELS[kind].toLowerCase()}`}
                    description="Tambahkan lewat formulir di samping."
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {rows.map((category) => (
                      <li key={category.id} className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              aria-hidden="true"
                              className={cx(
                                "h-9 w-9 shrink-0 rounded-xl",
                                category.isArchived && "opacity-40",
                              )}
                              style={{ backgroundColor: category.color }}
                            />
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                                {category.name}
                                {category.isArchived ? (
                                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                                    Diarsipkan
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-xs text-subtle-foreground">
                                {category.transactionCount} transaksi
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <ToggleArchiveCategoryButton
                              id={category.id}
                              isArchived={category.isArchived}
                            />
                            <DeleteCategoryButton
                              id={category.id}
                              name={category.name}
                              transactionCount={category.transactionCount}
                            />
                          </div>
                        </div>

                        <details className="mt-2.5">
                          <summary className="cursor-pointer rounded-lg px-1 py-0.5 text-xs font-medium text-muted-foreground transition hover:text-foreground">
                            Ubah kategori
                          </summary>
                          <div className="mt-3 max-w-md rounded-xl border border-border bg-surface-muted p-4">
                            <CategoryForm
                              action={updateCategory}
                              submitLabel="Simpan perubahan"
                              category={{
                                id: category.id,
                                name: category.name,
                                kind: category.kind as TransactionKind,
                                color: category.color,
                              }}
                            />
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader
            title="Tambah kategori"
            description="Kategori baru langsung tersedia di form transaksi."
          />
          <div className="p-5">
            <CategoryForm
              action={createCategory}
              submitLabel="Tambah kategori"
            />
            <p className="mt-4 border-t border-border pt-4 text-xs text-subtle-foreground">
              <span className="inline-flex items-center gap-1.5">
                <IconCategory className="h-3.5 w-3.5" />
                Warna kategori dipakai pada bar rincian di dashboard.
              </span>
            </p>
          </div>
        </Card>
      </div>

      <p className="text-xs text-subtle-foreground">
        Lihat kategori yang sudah dipakai di{" "}
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