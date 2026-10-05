"use client";

import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Header untuk layar kecil.
 *
 * Navigasi tidak disembunyikan di balik tombol hamburger. Instead-nya
 * memakai bilah tab tetap di bawah layar (lihat `MobileTabBar`), jadi
 * berpindah halaman cukup satu ketukan dan selalu kelihatan.
 *
 * Komponen ini hanya tampil di bawah `lg`; layar lebar memakai sidebar.
 */
export function MobileNav() {
  return (
    <>
      {/* Header HP memakai tint sidebar yang jauh lebih tipis supaya identitas
          visual yang sama terbawa, tanpa membuat header terasa berat. */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-linear-to-b from-sidebar/80 to-surface/85 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-sidebar-brand-from to-sidebar-brand-to text-white shadow-sm">
              <span className="text-[0.7rem] font-bold">Rp</span>
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Keuangan Pribadi
            </span>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      <MobileTabBar />
    </>
  );
}

/**
 * Bilah tab navigasi di bawah layar.
 *
 * Dipasang `fixed` supaya selalu terjangkau jempol. Halaman konten diberi
 * padding bawah yang cukup di `AppShell` agar baris terakhir tidak tertutup.
 */
function MobileTabBar() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface/85 shadow-lifted backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-md px-2 py-1.5">
        <NavLinks variant="tabbar" />
      </div>
    </nav>
  );
}
