"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

/**
 * Dialog konfirmasi untuk aksi merusak seperti menghapus.
 *
 * Berisi `<form action={...}>` sungguhan sehingga tombol konfirmasi
 * menjalankan Server Action. Status buka diatur dari luar agar pemanggil bisa
 * menutupnya kembali setelah aksi selesai.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  action,
  fields,
  submitLabel = "Hapus",
  cancelLabel = "Batal",
  pending = false,
  pendingLabel = "Memproses…",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  action: (formData: FormData) => void;
  fields: Record<string, string>;
  submitLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  children?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border border-border bg-surface p-0 text-left shadow-lifted backdrop:bg-foreground/40 backdrop:backdrop-blur-sm"
    >
      <form action={action} className="space-y-5 p-6">
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <div className="space-y-2">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-destructive-soft text-destructive">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
          {children}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}