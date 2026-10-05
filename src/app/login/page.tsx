"use client";

import { useActionState, useState } from "react";
import { login } from "@/server/actions/auth";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import { IconEye, IconEyeOff } from "@/components/Icons";
import type { ActionResult } from "@/lib/types";

const INITIAL_STATE: ActionResult = { ok: true };

/**
 * Halaman login.
 *
 * Tampil mandiri tanpa kerangka aplikasi (di luar route group `(app)`),
 * jadi tidak ada sidebar atau navigasi sebelum pengguna masuk. Desainnya
 * mengikuti bahasa visual aplikasi: kartu lembut di atas latar bergradasi
 * tipis dengan glow dekoratif, tipografi Inter, dan token warna semantik.
 */
export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const errorMessage = !state.ok ? state.message : undefined;

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Latar dekoratif: glow lembut, tidak menahan klik. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent-glow blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      </div>

      <main className="relative w-full max-w-sm">
        <div className="rounded-3xl border border-border/70 bg-surface/90 p-8 shadow-lifted backdrop-blur-sm sm:p-10">
          {/* Brand */}
          <div className="mb-8 text-center">
            <div
              aria-hidden
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-b from-primary-hover to-primary text-primary-foreground shadow-md shadow-primary/25"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
              >
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2.5" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Keuangan Pribadi
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Masuk untuk mengelola keuanganmu
            </p>
          </div>

          <form action={formAction} className="space-y-5">
            <FormField label="Username" htmlFor="username" required>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder="Username"
              />
            </FormField>

            <FormField label="Password" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Password"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-xl text-subtle-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {showPassword ? (
                    <IconEyeOff className="h-5 w-5" />
                  ) : (
                    <IconEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </FormField>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl border border-destructive-border bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive"
              >
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Memeriksa…" : "Masuk"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-subtle-foreground">
          Akses terbatas. Jaga kerahasiaan username dan passwordmu.
        </p>
      </main>
    </div>
  );
}
