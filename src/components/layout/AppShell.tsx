import type { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { SidebarNav } from "./SidebarNav";

/**
 * Kerangka halaman.
 *
 * Sidebar menempel di tepi kiri layar, bukan ikut dipusatkan. Karena itu
 * pembatas lebar dipakai pada ISI halaman saja, bukan pada container yang
 * membungkus sidebar. Kalau `max-w` dipasang di container luar, sidebar ikut
 * mengambang di tengah layar pada monitor lebar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    // `min-h-dvh`, bukan `min-h-screen`: di HP bilah alamat browser menambah
    // tinggi viewport saat menggulir, dan `100vh` memaksa halaman lebih tinggi
    // dari layar sehingga muncul ruang kosong di bawah.
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/*
        Skip link: fokus pertama di halaman ini melompat langsung ke konten,
        jadi pengguna keyboard tidak perlu menabrak sidebar dan header dulu.
        disembunyikan sampai difokuskan, lalu melayang di atas segalanya.
      */}
      <a
        href="#konten-utama"
        className="sr-only rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lifted focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Lompat ke konten utama
      </a>

      <MobileNav />

      {/* Sidebar adalah bidang berwarna di layout ini, jadi ia memakai token
          `sidebar-*` sendiri: gradien lembut + glow dekoratif, bukan sekadar
          permukaan putih dengan garis pembatas. */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-hidden border-r border-sidebar-border bg-linear-to-b from-sidebar to-sidebar-2 shadow-sidebar lg:block">
        <SidebarGlow />
        <div className="relative h-full">
          <SidebarNav />
        </div>
      </aside>

      {/*
        `tabIndex={-1}` supaya skip link benar-benar memindahkan fokus ke sini,
        bukan hanya mengubah posisi gulir. `focus:outline-none` dipakai karena
        elemen ini tidak boleh menampilkan cincin fokus saat fokus datang dari
        navigasi dalam aplikasi.
      */}
      <main
        id="konten-utama"
        tabIndex={-1}
        className="min-w-0 flex-1 focus:outline-none"
      >
        {/* Padding bawah ekstra di layar kecil untuk memberi ruang pada bilah
            tab fixed, supaya baris terakhir konten tidak tertutup. */}
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Dua blob cahaya di belakang isi sidebar.
 *
 * Dipisah ke komponen sendiri supaya `AppShell` tetap ramping dan supaya
 * elemen dekoratif ini bisa diabaikan pembaca layar lewat `aria-hidden`.
 * Pointer events dimatikan agar tidak pernah menahan klik pada menu.
 */
function SidebarGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="animate-drift absolute -top-24 -left-20 h-72 w-72 rounded-full bg-linear-to-br from-sidebar-brand-from/25 to-transparent blur-3xl" />
      <div className="absolute -right-24 -bottom-28 h-72 w-72 rounded-full bg-linear-to-tr from-sidebar-brand-to/25 to-transparent blur-3xl" />
    </div>
  );
}
