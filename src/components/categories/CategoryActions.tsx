"use client";

import {
  deleteCategory,
  toggleArchiveCategory,
} from "@/server/actions/categories";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export function ToggleArchiveCategoryButton({
  id,
  isArchived,
}: {
  id: string;
  isArchived: boolean;
}) {
  return (
    <ConfirmSubmitButton
      action={toggleArchiveCategory}
      fields={{ id }}
      title={isArchived ? "Aktifkan kembali kategori?" : "Arsipkan kategori?"}
      description={
        isArchived
          ? "Kategori akan muncul lagi di pilihan form transaksi."
          : "Kategori tidak bisa dipilih pada transaksi baru, tetapi transaksi lama tetap memakai kategori ini."
      }
      triggerLabel={isArchived ? "Aktifkan" : "Arsipkan"}
      triggerVariant="secondary"
      confirmLabel={isArchived ? "Aktifkan kategori" : "Arsipkan kategori"}
      pendingLabel="Memproses…"
    />
  );
}

export function DeleteCategoryButton({
  id,
  name,
  transactionCount,
}: {
  id: string;
  name: string;
  transactionCount: number;
}) {
  return (
    <ConfirmSubmitButton
      action={deleteCategory}
      fields={{ id }}
      title="Hapus kategori?"
      description={
        transactionCount > 0
          ? `"${name}" masih dipakai oleh ${transactionCount} transaksi, jadi kategori tidak bisa dihapus. Arsipkan sebagai gantinya.`
          : `"${name}" akan dihapus permanen.`
      }
      triggerLabel="Hapus"
      confirmLabel="Hapus kategori"
      pendingLabel="Menghapus…"
    />
  );
}