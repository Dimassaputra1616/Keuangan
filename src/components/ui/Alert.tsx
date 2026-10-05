"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconAlert, IconCheck, IconClose, IconInbox } from "@/components/Icons";
import type { ActionResult } from "@/lib/types";
import { cx } from "./Card";

/**
 * Notifikasi hasil aksi.
 *
 * `duration` menentukan berapa milidetik notifikasi tetap tampil sebelum
 * hilang sendiri:
 *   - lebih dari 0  -> tampilDuring `duration` ms, lalu meluncur, dengan
 *                     garis progres tipis yang menyusut sebagai pengingat
 *   - 0             -> tidak hilang sendiri, hanya bisa ditutup manual
 *
 * `alertDuration()` di bawah memilihkan nilai yang tepat untuk hasil Server
 * Action: pesan sukses selalu transient, sedangkan pesan error yang tidak
 * punya detail per-field tetap dibiarkan menetap supaya tidak terlewat.
 */

const ALERT_STYLES = {
  error: {
    wrapper: "border-destructive-border bg-destructive-soft text-destructive",
  },
  success: {
    wrapper: "border-income/30 bg-income-soft text-income",
  },
  info: {
    wrapper: "border-border bg-surface-muted text-muted-foreground",
  },
} as const;

export type AlertTone = keyof typeof ALERT_STYLES;

export function Alert({
  tone,
  children,
  duration = 0,
}: {
  tone: AlertTone;
  children: ReactNode;
  duration?: number;
}) {
  const [mounted, setMounted] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (duration <= 0) return;

    // Meluncur dulu, baru dilepas, supaya tidak terlihat hilang mendadak.
    const fade = setTimeout(() => setLeaving(true), duration);
    const remove = setTimeout(() => setMounted(false), duration + 200);

    return () => {
      clearTimeout(fade);
      clearTimeout(remove);
    };
  }, [duration]);

  if (!mounted) return null;

  const styles = ALERT_STYLES[tone];
  const Icon = tone === "success" ? IconCheck : tone === "info" ? IconInbox : IconAlert;

  return (
    <div
      // `aria-live` dipakai supaya pergantian pesan setelah Server Action
      // selesai tetap diumumkan pembaca layar tanpa memindahkan fokus.
      aria-live={tone === "error" ? "assertive" : "polite"}
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "relative flex items-start gap-2.5 overflow-hidden rounded-xl border",
        "px-3.5 py-3 pr-11 text-sm transition-all duration-200",
        leaving && "-translate-y-1 opacity-0",
        styles.wrapper,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{children}</span>

      {/*
        Area sentuhnya 44px sesuai syarat target sentuh, tapi ikonnya tetap
        kecil supaya notifikasi tidak terasa berat. `after:` memperluas area
        klik tanpa menambah tinggi baris notifikasi.
      */}
      <button
        type="button"
        onClick={() => setMounted(false)}
        aria-label="Tutup notifikasi"
        className="absolute right-0 top-0 grid size-11 cursor-pointer place-items-center rounded-lg opacity-60 transition hover:bg-foreground/8 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current"
      >
        <IconClose className="size-3.5" />
      </button>

      {duration > 0 ? (
        <span
          aria-hidden="true"
          className="animate-alert-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-current opacity-40"
          style={{ animationDuration: `${duration}ms` }}
        />
      ) : null}
    </div>
  );
}

/**
 * Durasi notifikasi untuk hasil Server Action.
 *
 * Sukses tidak perlu ditahan karena tidak ada yang perlu ditindaklanjuti.
 * Error yang sudah punya pesan per-field juga boleh hilang karena detailnya
 * tetap terlihat di bawah input terkait. Error tanpa detail per-field
 * permanecer, sebab notifikasi itu satu-satunya tempat pesannya tampil.
 */
export function alertDuration(result: ActionResult): number {
  if (result.ok) return 3000;

  const hasFieldDetail =
    result.errors !== undefined && Object.keys(result.errors).length > 0;

  return hasFieldDetail ? 3000 : 0;
}
