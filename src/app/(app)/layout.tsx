import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Layout khusus area aplikasi (di dalam route group `(app)`).
 *
 * Route group tidak memengaruhi URL, jadi `/`, `/akun`, `/transaksi`, dan
 * lain-lain tetap sama. Yang berubah hanya: halaman di dalam grup ini
 * dibungkus AppShell (sidebar + navigasi), sedangkan halaman di luar grup
 * (misalnya `/login`) tampil mandiri tanpa kerangka aplikasi.
 */
export default function AppGroupLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
