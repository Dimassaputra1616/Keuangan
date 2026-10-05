"use client";

import {
  deletePayment,
  deleteReceivable,
  toggleCancelReceivable,
} from "@/server/actions/receivables";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";

export function ToggleCancelReceivableButton({
  id,
  isCancelled,
  remaining,
}: {
  id: string;
  isCancelled: boolean;
  remaining: number;
}) {
  return (
    <ConfirmSubmitButton
      action={toggleCancelReceivable}
      fields={{ id }}
      title={isCancelled ? "Aktifkan kembali piutang?" : "Batalkan piutang?"}
      description={
        isCancelled
          ? "Piutang akan dihitung lagi dalam total tagihan."
          : remaining > 0
            ? `Sisa ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(remaining)} akan dianggap tidak akan ditagih lagi. Transaksi kas tetap dipertahankan.`
            : "Piutang akan ditandai tidak aktif. Transaksi kas tetap dipertahankan."
      }
      triggerLabel={isCancelled ? "Aktifkan" : "Batalkan"}
      triggerVariant="secondary"
      confirmLabel={isCancelled ? "Aktifkan piutang" : "Batalkan piutang"}
      pendingLabel="Memproses…"
    />
  );
}

export function DeleteReceivableButton({
  id,
  personName,
  paymentCount,
}: {
  id: string;
  personName: string;
  paymentCount: number;
}) {
  return (
    <ConfirmSubmitButton
      action={deleteReceivable}
      fields={{ id }}
      title="Hapus piutang?"
      description={
        paymentCount > 0
          ? `Piutang kepada ${personName} sudah punya ${paymentCount} pembayaran sehingga tidak bisa dihapus. Batalkan saja bila tidak akan ditagih lagi.`
          : `Piutang kepada ${personName} beserta transaksi pengeluarannya akan dihapus permanen.`
      }
      triggerLabel="Hapus"
      confirmLabel="Hapus piutang"
      pendingLabel="Menghapus…"
    />
  );
}

export function DeletePaymentButton({
  receivableId,
  paymentId,
  amountLabel,
  receivedAtLabel,
}: {
  receivableId: string;
  paymentId: string;
  amountLabel: string;
  receivedAtLabel: string;
}) {
  return (
    <ConfirmSubmitButton
      action={deletePayment}
      fields={{ receivableId, paymentId }}
      title="Hapus pembayaran?"
      description={`Pembayaran ${amountLabel} pada ${receivedAtLabel} akan dihapus, termasuk transaksi pemasukan yang terkait.`}
      triggerLabel="Hapus"
      confirmLabel="Hapus pembayaran"
      pendingLabel="Menghapus…"
    />
  );
}