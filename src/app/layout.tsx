import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Keuangan Pribadi",
  description:
    "Pencatat keuangan pribadi: transaksi, kategori, akun, dan ringkasan bulanan.",
};

/**
 * Skrip anti-kedip. Harus berjalan SEBELUM React meng-hydrate dan sebelum
 * halaman digambar, karena itu placed inline di dalam `<head>`.
 *
 * Prioritas tema tersimpan; bila belum pernah disetel, ikut preferensi
 * sistem operasi.
 */
const themeScript = `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    // `suppressHydrationWarning` wajib karena skrip di atas memodifikasi
    // atribut <html> sebelum React hydrate.
    <html lang="id" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}