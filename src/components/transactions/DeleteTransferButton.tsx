"use client";

import { deleteTransfer } from "@/server/actions/transfers";
import { IconTrash } from "@/components/Icons";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export function DeleteTransferButton({
  id,
  description,
}: {
  id: string;
  description: string;
}) {
  return (
    <ConfirmSubmitButton
      action={deleteTransfer}
      fields={{ transferId: id }}
      title="Hapus transfer?"
      description={`${description} akan dihapus. Saldo kedua akun kembali seperti sebelum transfer ini.`}
      triggerLabel="Hapus"
      triggerIcon={<IconTrash className="h-3.5 w-3.5" />}
      confirmLabel="Hapus transfer"
      pendingLabel="Menghapus…"
    />
  );
}
