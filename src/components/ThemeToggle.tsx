"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/Icons";
import { cx } from "@/components/ui/Card";

const STORAGE_KEY = "theme";

/**
 * Pengalih tema terang dan gelap.
 *
 * Kelas `dark` pada elemen `<html>` dipasang oleh skrip inline di
 * `layout.tsx` sebelum halaman digambar, sehingga tidak ada kedipan putih saat
 * reload. Komponen ini hanya menyinkronkan state-nya setelah hydration.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Penyimpanan bisa diblokir pada mode privat. Tema tetap berlaku untuk
      // sesi berjalan saja tanpa disimpan.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={isDark ? "Mode terang" : "Mode gelap"}
      // `className` dipakai lewat cx supaya konteks pemanggil (mis. sidebar
      // yang berwarna) bisa menimpa gaya dasar tanpa menduplikasi logika.
      className={cx(
        "grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:bg-surface-hover hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {/* Placeholder menjaga ukuran tetap stabil sebelum hydration. */}
      {!mounted ? (
        <span className="h-5 w-5" />
      ) : isDark ? (
        <IconSun className="h-5 w-5" />
      ) : (
        <IconMoon className="h-5 w-5" />
      )}
    </button>
  );
}
