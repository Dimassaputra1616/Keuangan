/**
 * Utilitas uang rupiah.
 *
 * Keputusan desain: nominal disimpan sebagai `Int` (32-bit signed) dalam rupiah
 * penuh tanpa sen, dan `amount` selalu positif. Arah aliran uang ditentukan
 * oleh `Transaction.kind`, bukan oleh tanda angka.
 *
 * `BigInt` sengaja tidak dipakai: nilainya tidak bisa di-`JSON.stringify`, jadi
 * akan memicu error "Props must be serializable" saat melewati batas Server
 * Component → Client Component.
 */

/** Batas kolom INTEGER 32-bit signed. */
export const MAX_RUPIAH = 2_147_483_647;

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Format untuk ditampilkan, contoh: `Rp 1.250.000`. */
export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value);
}

/** Angka dengan pemisah ribuan tanpa simbol mata uang, contoh: `1.250.000`. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/**
 * Format nilai untuk `<input>`: hanya digit dengan pemisah ribuan,
 * contoh `1250000` → `1.250.000`.
 */
export function formatInputAmount(value: number): string {
  return numberFormatter.format(value);
}

/**
 * Bersihkan input mentah pengguna menjadi integer rupiah.
 *
 * Menerima hasil ketik `CurrencyInput` seperti `"1.250.000"` maupun input
 * polos `"1250000"`. Semua karakter non-digit dibuang, sehingga tanda minus
 * ikut hilang — memang tidak ada nominal negatif di model data ini.
 *
 * Mengembalikan `null` bila kosong, bukan angka, atau melebihi batas `Int`.
 */
export function parseRupiahInput(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  const digits =
    typeof input === "number" ? String(input) : String(input).replace(/\D/g, "");

  if (digits.length === 0) return null;

  const parsed = Number.parseInt(digits, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  if (parsed > MAX_RUPIAH) return null;

  return parsed;
}

/**
 * Bersihkan input untuk SALDO AWAL akun, yang boleh nol maupun negatif
 * (misalnya overdraft kartu kredit). Tanda minus di depan angka dihormati,
 * seluruh karakter lain dibuang. Input kosong berarti nol.
 *
 * Mengembalikan `null` bila tidak bisa diparse atau melebihi batas `Int`.
 */
export function parseSignedRupiahInput(
  input: string | number | null | undefined,
): number | null {
  if (input === null || input === undefined) return null;

  const raw =
    typeof input === "number" ? String(input) : String(input).trim();

  if (raw.length === 0) return 0;

  const isNegative = raw.startsWith("-");
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;

  const magnitude = Number.parseInt(digits, 10);
  if (!Number.isInteger(magnitude) || magnitude > MAX_RUPIAH) return null;

  return isNegative ? -magnitude : magnitude;
}

/** True bila nilai layak disimpan ke kolom `Int`. */
export function isValidRupiah(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= MAX_RUPIAH;
}

/**
 * Terapkan tanda sesuai `kind`. `amount` di database selalu positif; nilai
 * negatif hanya dipakai saat perhitungan aritmetika di memori.
 */
export function signedAmount(amount: number, kind: "INCOME" | "EXPENSE"): number {
  return kind === "INCOME" ? amount : -amount;
}

/** Persentase proporsi tanpa pembulatan yang membingungkan. 0 bila total 0. */
export function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** Rentang aman untuk nilai turunan (saldo, total kekayaan), bukan kolom DB. */
export const MAX_SAFE_RUPIAH = Number.MAX_SAFE_INTEGER;

/**
 * Jumlahkan nominal tanpa keluar dari rentang angka yang aman.
 *
 * Setiap `Transaction.amount` sudah dijaga ≤ `MAX_RUPIAH` oleh validasi, tapi
 * SALDO AKUN adalah hasil penjumlahan banyak transaksi. Satu akun dengan
 * beberapa transaksi besar bisa melewati batas `Int` 32-bit, dan karena saldo
 * ikut dipakai untuk menentukan total kekayaan, angka yang meleset di sini
 * langsung merusak laporan — bukan sekadar tampil salah.
 *
 * Batasnya penting: penjumlahan dijaga tetap di dalam rentang
 * `Number.MAX_SAFE_INTEGER`, jadi tidak ada pembulatan diam-diam yang membuat
 * angka rupiah berbeda beberapa satuan dari nilai sebenarnya.
 */
export function safeSum(values: number[]): number {
  let total = 0;

  for (const value of values) {
    total += value;
    if (total > MAX_SAFE_RUPIAH || total < -MAX_SAFE_RUPIAH) {
      return total > 0 ? MAX_SAFE_RUPIAH : -MAX_SAFE_RUPIAH;
    }
  }

  return total;
}

/**
 * Susun saldo akun dari komponen-komponennya, dengan penjumlahan aman.
 *
 * Dihitung di satu tempat supaya rumus saldo tidak lagi diulang di beberapa
 * query dan tidak bisa berbeda antar halaman.
 */
export function accountBalanceOf(parts: {
  initialBalance: number;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
}): number {
  return safeSum([
    parts.initialBalance,
    parts.income,
    -parts.expense,
    parts.transferIn,
    -parts.transferOut,
  ]);
}