/**
 * Utilitas tanggal & bulan.
 *
 * Aturan penting (lihat juga `prisma/schema.prisma`):
 *   - `Transaction.occurredAt` disimpan sebagai UTC midnight dari tanggal lokal
 *     Asia/Jakarta. Input `2026-10-01` → `2026-10-01T00:00:00.000Z`.
 *   - Semua query rentang bulan memakai batas UTC lewat `monthToRange()`.
 *
 * Kenapa UTC midnight dan bukan offset asli (+07:00)? Karena SQLite menyimpan
 * `DATETIME` sebagai teks dan membandingkannya secara leksikografis. Dengan
 * seluruh nilai dinormalisasi ke UTC, batas bulan selalu konsisten dan transaksi
 * tidak pernah meleset ke bulan tetangga saat agregasi.
 */

export const APP_TIME_ZONE = "Asia/Jakarta";

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/** Format ringkas untuk tabel: `1 Okt 2026`. */
export const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

/** Key bulan berbentuk `YYYY-MM`, dipakai di query string dan agregasi. */
export type MonthKey = string;

const jakartaPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type DateParts = { year: number; month: number; day: number };

/** Ambil tanggal kalender lokal di Asia/Jakarta dari sebuah titik waktu. */
function jakartaDateParts(date: Date): DateParts {
  const parts = jakartaPartsFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN);

  return { year: read("year"), month: read("month"), day: read("day") };
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

/** Key bulan saat ini menurut waktu lokal Asia/Jakarta. */
export function getCurrentMonthKey(): MonthKey {
  const { year, month } = jakartaDateParts(new Date());
  return `${year}-${pad(month)}`;
}

/** Nilai hari ini untuk `<input type="date">`, contoh `2026-10-01`. */
export function getTodayInputValue(): string {
  const { year, month, day } = jakartaDateParts(new Date());
  return `${year}-${pad(month)}-${pad(day)}`;
}

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse `YYYY-MM` menjadi `{ year, month }`, atau `null` bila tidak valid. */
export function parseMonthKey(
  value: string | null | undefined,
): { year: number; month: number } | null {
  if (!value) return null;
  const match = MONTH_KEY_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > 2999) return null;

  return { year, month };
}

/**
 * Samakan input pengguna (query string) dengan key bulan yang valid.
 * Nilai rusak atau kosong jatuh ke bulan berjalan supaya halaman tidak error 500.
 */
export function normalizeMonthKey(value: string | null | undefined): MonthKey {
  return parseMonthKey(value) ? value!.trim() : getCurrentMonthKey();
}

/**
 * Rentang setengah terbuka `[start, end)` untuk query Prisma.
 * `end` adalah tanggal 1 pukul 00:00 UTC pada bulan berikutnya.
 */
export function monthToRange(monthKey: MonthKey): { start: Date; end: Date } {
  const { year, month } = parseMonthKey(monthKey) ?? parseMonthKey(getCurrentMonthKey())!;

  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/** Rentang tahun yang boleh dipakai sebagai key bulan. */
export const MIN_MONTH_YEAR = 1900;
export const MAX_MONTH_YEAR = 2999;

/**
 * Geser key bulan sejumlah bulan, positif ke depan negatif ke belakang.
 *
 * Hasilnya di-clamp ke rentang tahun yang valid. Tanpa clamp, menggeser dari
 * `1900-01` ke belakang menghasilkan `1899-12`, yang `parseMonthKey()` tolak
 * sebagai tidak valid — dan `monthToRange()` lalu diam-diam memakai bulan
 * BERJALAN. Akibatnya user menekan "Bulan lalu" berulang kali dan selalu
 * melihat data bulan yang sama tanpa tahu apa yang terjadi.
 */
export function shiftMonth(monthKey: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(monthKey) ?? parseMonthKey(getCurrentMonthKey())!;

  // Dihitung sebagai indeks bulan absolut lalu dikonversi balik, bukan dengan
  // mengoreksi tahun/bulan terpisah. Cara kedua rawan: menggeser `1900-01` ke
  // belakang menghasilkan tahun `1899` dan bulan `12`, dan kalau hanya tahun
  // yang di-clamp hasilnya jadi `1900-12` — bulan yang benar-benar tidak ada
  // hubungannya dengan posisi awal.
  const minIndex = MIN_MONTH_YEAR * 12;
  const maxIndex = MAX_MONTH_YEAR * 12 + 11;

  const index = Math.min(maxIndex, Math.max(minIndex, year * 12 + (month - 1) + delta));

  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** Label bulan Bahasa Indonesia, contoh `Oktober 2026`. */
export function formatMonthLabel(monthKey: MonthKey): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;

  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
}

/**
 * Normalisasi nilai `<input type="date">` (`YYYY-MM-DD`) menjadi UTC midnight.
 * Mengembalikan `null` untuk input rusak, termasuk tanggal kalender yang tidak
 * pernah ada seperti 31 Februari.
 */
export function toUtcMidnight(dateInput: string | null | undefined): Date | null {
  if (!dateInput) return null;
  const match = DATE_INPUT_PATTERN.exec(dateInput.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // `Date.UTC` memperlakukan tahun 0-99 sebagai 1900-1999, jadi `0099` akan
  // diam-diam menjadi 1999. Tahun di bawah 100 ditolak eksplisit, dan rentang
  // yang jauh ke depan juga dibatasi supaya tidak menabrak batas Date.
  if (year < MIN_MONTH_YEAR || year > MAX_MONTH_YEAR) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealCalendarDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isRealCalendarDate ? date : null;
}

/** Kebalikan `toUtcMidnight`: UTC midnight → nilai untuk `<input type="date">`. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Label tanggal lengkap menurut waktu lokal Jakarta, contoh `1 Oktober 2026`. */
export function formatDateLong(date: Date): string {
  const { year, month, day } = jakartaDateParts(date);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/** Label tanggal ringkas untuk tabel, contoh `1 Okt 2026`. */
export function formatDateShort(date: Date): string {
  const { year, month, day } = jakartaDateParts(date);
  return `${day} ${MONTH_NAMES_SHORT[month - 1]} ${year}`;
}