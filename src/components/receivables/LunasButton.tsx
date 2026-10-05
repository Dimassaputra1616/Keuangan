"use client";

import { useEffect, useRef, useState } from "react";
import { addPayment } from "@/server/actions/receivables";
import { IconCheck } from "@/components/Icons";
import { Button } from "@/components/ui/Button";
import { PaymentForm } from "./PaymentForm";
import type { SelectOption } from "./ReceivableForm";

/**
 * Tombol "Lunas" untuk satu baris piutang.
 *
 * Membuka dialog berisi form pembayaran yang sudah terisi penuh sisa tagihan,
 * sehingga tidak perlu masuk ke halaman detail dulu. Nominal tetap bisa diubah
 * kalau yang diterima ternyata kurang.
 *
 * Memakai `PaymentForm` yang sama dengan halaman detail supaya ada satu
 * sumber kebenaran untuk validasi dan pesan error.
 */
export function LunasButton({
  receivableId,
  personName,
  remaining,
  lentAtDay,
  accounts,
  incomeCategories,
  defaultAccountId,
  defaultCategoryId,
}: {
  receivableId: string;
  personName: string;
  remaining: number;
  lentAtDay: string;
  accounts: SelectOption[];
  incomeCategories: SelectOption[];
  defaultAccountId?: string;
  defaultCategoryId?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <IconCheck className="h-3.5 w-3.5" />
        Lunas
      </Button>

      <dialog
        ref={dialogRef}
        aria-label={`Tandai lunas piutang ${personName}`}
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-card border border-border bg-surface p-0 text-left shadow-lifted backdrop:bg-foreground/40 backdrop:backdrop-blur-sm"
      >
        <div className="space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Tandai lunas
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mencatat pembayaran penuh untuk{" "}
              <strong className="font-semibold text-foreground">{personName}</strong>{" "}
              sebesar sisa tagihan. Nominalnya masih bisa diubah kalau yang
              diterima kurang.
            </p>
          </div>

          <PaymentForm
            action={addPayment}
            receivableId={receivableId}
            personName={personName}
            remaining={remaining}
            lentAtDay={lentAtDay}
            accounts={accounts}
            incomeCategories={incomeCategories}
            defaultAccountId={defaultAccountId}
            defaultCategoryId={defaultCategoryId}
            defaultAmount={remaining}
            onSuccess={() => setOpen(false)}
          />

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Batal
          </Button>
        </div>
      </dialog>
    </>
  );
}
