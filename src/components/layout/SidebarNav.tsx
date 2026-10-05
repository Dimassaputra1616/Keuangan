"use client";

import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconSparkle } from "@/components/Icons";

/**
 * Isi sidebar untuk layar lebar.
 *
 * Seluruh warna di sini memakai token `sidebar-*`, bukan `foreground`/`muted`.
 * Alasannya sidebar punya latar gradien sendiri, jadi teksnya harus punya
 * skala warna yang terpisah agar kontrasnya tetap terjaga di kedua mode.
 *
 * Di layar kecil navigasi pindah ke bilah tab bawah, jadi komponen ini tidak
 * butuh lagi callback untuk menutup laci navigasi.
 */
export function SidebarNav() {
  return (
    <div className="flex h-full flex-col gap-7 p-5">
      <Link href="/" className="group flex items-center gap-3 rounded-2xl">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sidebar-brand-from to-sidebar-brand-to text-white shadow-lifted transition duration-200 group-hover:-rotate-3">
          <span className="text-xs font-bold">Rp</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
            Keuangan Pribadi
          </span>
          <span className="block truncate text-xs text-sidebar-subtle">
            Pencatat keuangan lokal
          </span>
        </span>
      </Link>

      {/* `overflow-y-auto` supaya di layar yang pendek bagian bawah
          (info data lokal) tetap terjangkau lewat scroll, bukan terpotong. */}
      <nav
        aria-label="Navigasi utama"
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <NavLinks />
      </nav>

      <LogoutButton />

      <div className="space-y-3 border-t border-sidebar-border pt-4">
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-sidebar-border bg-sidebar-active/60 px-3 py-2.5 backdrop-blur-sm">
          <p className="flex items-center gap-2 text-xs text-sidebar-muted">
            <IconSparkle className="h-4 w-4" />
            Data lokal
          </p>
          <ThemeToggle className="border-sidebar-border bg-transparent text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground" />
        </div>
        <p className="px-1 text-xs leading-relaxed text-sidebar-subtle">
          Tersimpan di SQLite pada mesin ini. Belum ada sinkronisasi cloud.
        </p>
      </div>
    </div>
  );
}

