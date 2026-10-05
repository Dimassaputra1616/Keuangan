"use server";

import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/types";

/**
 * Aksi login/logout.
 *
 * Kredensial tunggal diambil dari environment (`BASIC_AUTH_USER` /
 * `BASIC_AUTH_PASS`) — sama seperti gembok Basic Auth sebelumnya, hanya
 * mekanismenya diganti: bukan lagi popup bawaan browser, melainkan form
 * login di `/login` dengan cookie sesi bertanda tangan.
 *
 * Cookie `httpOnly` sehingga tidak bisa dibaca JavaScript, `secure` di
 * production, dan kedaluwarsa 30 hari.
 */

function getCredentials(): { user: string; pass: string } | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) return null;
  return { user, pass };
}

/** Perbandingan password anti timing-attack. */
function passwordMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function login(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creds = getCredentials();
  // Mode lokal tanpa kredensial: tidak ada yang perlu di-login.
  if (!creds) {
    redirect("/");
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (username !== creds.user || !passwordMatches(password, creds.pass)) {
    return actionError("Username atau password salah. Coba lagi.");
  }

  const token = await createSessionToken(username, creds.pass);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // `redirect()` harus di luar try — ia melempar NEXT_REDIRECT.
  redirect("/");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
