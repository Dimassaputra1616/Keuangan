"use client";

import {
  deleteAccount,
  toggleArchiveAccount,
} from "@/server/actions/accounts";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

/** Tombol arsipkan/aktifkan untuk satu akun. */
export function ToggleArchiveAccountButton({
  id,
  isArchived,
}: {
  id: string;
  isArchived: boolean;
}) {
  return (
    <ConfirmSubmitButton
      action={toggleArchiveAccount}
      fields={{ id }}
      title={isArchived ? "Aktifkan kembali akun?" : "Arsipkan akun?"}
      description={
        isArchived
          ? "Akun akan muncul lagi di pilihan form transaksi."
          : "Akun tidak bisa dipilih pada transaksi baru, tetapi riwayat dan saldonya tetap tersimpan."
      }
      triggerLabel={isArchived ? "Aktifkan" : "Arsipkan"}
      triggerVariant="secondary"
      confirmLabel={isArchived ? "Aktifkan akun" : "Arsipkan akun"}
      pendingLabel="Memproses…"
    />
  );
}

/** Tombol hapus akun. Diblokir Server Action bila masih ada transaksi. */
export function DeleteAccountButton({
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
      action={deleteAccount}
      fields={{ id }}
      title="Hapus akun?"
      description={
        transactionCount > 0
          ? `"${name}" masih dipakai oleh ${transactionCount} transaksi, jadi akun tidak bisa dihapus. Arsipkan sebagai gantinya.`
          : `"${name}" akan dihapus permanen.`
      }
      triggerLabel="Hapus"
      confirmLabel="Hapus akun"
      pendingLabel="Menghapus…"
    />
  );
}