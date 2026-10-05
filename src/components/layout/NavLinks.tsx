"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCategory,
  IconDashboard,
  IconReceivable,
  IconTransactions,
  IconWallet,
} from "@/components/Icons";
import { cx } from "@/components/ui/Card";

const LINKS = [
  { href: "/", label: "Dashboard", icon: IconDashboard },
  { href: "/transaksi", label: "Transaksi", icon: IconTransactions },
  { href: "/piutang", label: "Piutang", icon: IconReceivable },
  { href: "/kategori", label: "Kategori", icon: IconCategory },
  { href: "/akun", label: "Akun", icon: IconWallet },
] as const;

type NavVariant = "sidebar" | "tabbar";

/**
 * Daftar navigasi utama.
 *
 * Harus Client Component karena penandaan rute aktif memakai `usePathname()`.
 *
 * `sidebar` untuk layar lebar, `tabbar` untuk bilah tab bawah di HP. Rute
 * aktif ditandai lewat latar pil di sidebar dan garis penanda di atas tab,
 * jadi tidak bergantung pada perbedaan warna teks saja.
 */
export function NavLinks({ variant = "sidebar" }: { variant?: NavVariant }) {
  const pathname = usePathname();

  if (variant === "tabbar") {
    return (
      <ul className="flex items-stretch">
        {LINKS.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          const Icon = link.icon;

          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                  "relative flex min-h-12 cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-2",
                  "text-[0.7rem] font-medium transition",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* Garis penanda di atas, menempel tepi atas bilah tab. */}
                <span
                  aria-hidden="true"
                  className={cx(
                    "absolute inset-x-3 -top-px h-0.5 rounded-full bg-linear-to-r from-transparent via-primary to-transparent transition-opacity duration-200",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  className={cx(
                    "h-[1.35rem] w-[1.35rem] shrink-0 transition-transform",
                    isActive && "scale-105",
                  )}
                />
                <span className="truncate leading-none">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="space-y-1.5">
      {LINKS.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        const Icon = link.icon;

        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cx(
                "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200",
                isActive
                  ? "bg-sidebar-active text-sidebar-active-foreground shadow-card"
                  : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
              )}
            >
              {/* Titik penanda di kiri memberi bentuk pada item aktif selain
                  perbedaan warna, jadi tetap terbaca bagi mata yang peering. */}
              <span
                aria-hidden="true"
                className={cx(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-linear-to-b from-sidebar-brand-from to-sidebar-brand-to transition-opacity duration-200",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon
                className={cx(
                  "h-[1.15rem] w-[1.15rem] shrink-0 transition-transform duration-200",
                  isActive
                    ? "text-sidebar-brand-from"
                    : "text-sidebar-subtle group-hover:scale-110",
                )}
              />
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
