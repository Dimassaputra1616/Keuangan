"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/types";
import { Button, type ButtonVariant } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";

const INITIAL_RESULT: ActionResult = { ok: false, message: "" };

/**
 * Tombol ber-dialog-konfirmasi yang menjalankan Server Action.
 *
 * Dipakai ulang untuk hapus transaksi, akun, dan kategori agar perilaku
 * (loading, pesan error, tutup dialog otomatis) konsisten di semua tempat.
 */
export function ConfirmSubmitButton({
  action,
  fields,
  title,
  description,
  triggerLabel,
  triggerIcon,
  triggerVariant = "danger",
  confirmLabel = "Hapus",
  pendingLabel = "Memproses…",
}: {
  action: (
    previous: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  fields: Record<string, string>;
  title: string;
  description?: string;
  triggerLabel: string;
  /** Bila diisi, teks label disembunyikan di layar kecil supaya hemat ruang. */
  triggerIcon?: ReactNode;
  triggerVariant?: ButtonVariant;
  confirmLabel?: string;
  pendingLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [result, formAction, pending] = useActionState(action, INITIAL_RESULT);

  useEffect(() => {
    if (result.ok) setOpen(false);
  }, [result]);

  return (
    <>
      <Button
        variant={triggerVariant}
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        title={triggerLabel}
      >
        {triggerIcon ? (
          <>
            {triggerIcon}
            <span className="hidden sm:inline">{triggerLabel}</span>
          </>
        ) : (
          triggerLabel
        )}
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        action={formAction}
        fields={fields}
        submitLabel={confirmLabel}
        pending={pending}
        pendingLabel={pendingLabel}
      >
        {/*
          Galat Server Action tidak punya detail per-field, jadi pesan ini satu-
          satunya tempat informasinya tampil. `role="alert"` supaya langsung
          diumumkan, tanpa harus menunggu pengguna menemukan dialog lagi.
        */}
        {!result.ok && result.message ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {result.message}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}