// Gembok login untuk akses publik.
//
// Aplikasi ini tidak punya sistem user; satu kredensial bersama (dari
// environment `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`) menjaga seluruh aplikasi.
// Mekanismenya: form login di `/login` membuat cookie sesi bertanda tangan,
// middleware ini memverifikasinya di setiap request.
//
// Aktif hanya bila kedua env var diset — tanpa keduanya, aplikasi tetap
// terbuka seperti perilaku lokal semula.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth";

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const secret = process.env.BASIC_AUTH_PASS;
  if (!secret) return false;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  const username = await verifySessionToken(token, secret);
  return username !== null;
}

export async function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  const { pathname } = request.nextUrl;

  // API bot punya auth sendiri (Bearer BOT_API_KEY), tidak ikut sesi browser.
  if (pathname.startsWith("/api/bot/")) {
    return NextResponse.next();
  }

  // Kredensial belum dikonfigurasi: biarkan lewat (mode lokal).
  if (!user || !pass) {
    return NextResponse.next();
  }

  const loggedIn = await isAuthenticated(request);

  // Halaman login selalu boleh dibuka; yang sudah login dilempar ke beranda.
  if (pathname === "/login") {
    if (loggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (loggedIn) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Abaikan aset statis dan favicon supaya tidak ikut dicek sesi.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
