"use client";

import { deleteTransaction } from "@/server/actions/transactions";
import { IconTrash } from "@/components/Icons";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export function DeleteTransactionButton({
  id,
  description,
}: {
  id: string;
  description: string;
}) {
  return (
    <ConfirmSubmitButton
      action={deleteTransaction}
      fields={{ id }}
      title="Hapus transaksi?"
      description={`"${description}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
      triggerLabel="Hapus"
      triggerIcon={<IconTrash className="h-3.5 w-3.5" />}
      confirmLabel="Hapus transaksi"
      pendingLabel="Menghapus…"
    />
  );
}