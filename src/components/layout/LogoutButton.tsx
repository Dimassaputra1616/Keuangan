"use client";

import { logout } from "@/server/actions/auth";

/**
 * Tombol keluar di sidebar.
 *
 * Memakai form biasa (bukan fetch) supaya Server Action `logout` bisa
 * menghapus cookie lalu redirect — pola yang sama dengan form lain di
 * aplikasi ini.
 */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={
          "flex w-full cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm text-sidebar-muted transition duration-200 hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
          (className ?? "")
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Keluar
      </button>
    </form>
  );
}
