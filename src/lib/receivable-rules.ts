import { MAX_RUPIAH, formatRupiah } from "@/lib/money";

/**
 * Aturan bisnis piutang yang murni (tanpa akses database).
 *
 * Dipisah supaya bisa diuji langsung tanpa perlu menjalankan Server Action,
 * dan dipakai oleh `src/server/actions/receivables.ts` agar tidak ada duplikat
 * logika antara validasi dan tampilan pesan.
 */

/** Sisa piutang dari nominal pokok dan total yang sudah dibayar. */
export function remainingOf(amount: number, paidTotal: number): number {
  return amount - paidTotal;
}

/**
 * Validasi nominal pembayaran terhadap sisa piutang.
 * Mengembalikan pesan kesalahan, atau `null` bila pembayaran valid.
 */
export function checkPaymentWithinLimit(
  paymentAmount: number,
  remaining: number,
): string | null {
  if (remaining <= 0) {
    return "Piutang ini sudah lunas sehingga tidak bisa menerima pembayaran lagi.";
  }

  if (paymentAmount > remaining) {
    return `Pembayaran melebihi sisa piutang. Sisa yang harus dilunasi tinggal ${formatRupiah(remaining)}.`;
  }

  return null;
}

/**
 * Validasi nominal pokok saat piutang diubah.
 * Nominal tidak boleh turun di bawah total yang sudah dibayar, karena itu
 * membuat sisa piutang bernilai negatif.
 */
export function checkReceivableAmount(
  newAmount: number,
  paidTotal: number,
): string | null {
  if (newAmount < paidTotal) {
    return `Nominal tidak boleh lebih kecil dari total pembayaran yang sudah tercatat (${formatRupiah(paidTotal)}).`;
  }

  return null;
}

/**
 * Validasi tanggal pembayaran: tidak boleh mendahului tanggal pinjam.
 * Perbandingan dilakukan pada string `YYYY-MM-DD` sehingga tidak terkena
 * masalah zona waktu.
 */
export function checkPaymentDate(
  receivedAtDay: string,
  lentAtDay: string,
): string | null {
  if (receivedAtDay < lentAtDay) {
    return "Tanggal bayar tidak boleh sebelum tanggal pinjam.";
  }

  return null;
}

/** Validasi nilai tanggal jatuh tempo terhadap tanggal pinjam. */
export function checkDueDate(
  dueAtDay: string | null,
  lentAtDay: string,
): string | null {
  if (!dueAtDay) return null;

  if (dueAtDay < lentAtDay) {
    return "Jatuh tempo tidak boleh sebelum tanggal pinjam.";
  }

  return null;
}

/** Validasi nominal pokok agar muat di kolom INTEGER 32-bit. */
export function checkAmountRange(amount: number): string | null {
  if (!Number.isInteger(amount) || amount <= 0) {
    return "Nominal harus berupa angka positif.";
  }

  if (amount > MAX_RUPIAH) {
    return `Nominal maksimal ${formatRupiah(MAX_RUPIAH)}.`;
  }

  return null;
}

/**
 * Saringan daftar piutang di halaman `/piutang`.
 *
 * `aktif` = yang masih harus ditagih (belum lunas dan belum dibatalkan)
 * `lunas` = sudah lunas, sisa nol
 * `semua` = seluruh data, termasuk yang dibatalkan
 */
export type ReceivableFilter = "aktif" | "lunas" | "semua";

export function parseReceivableFilter(
  value: string | null | undefined,
): ReceivableFilter {
  return value === "lunas" || value === "semua" ? value : "aktif";
}

export function filterReceivables<
  T extends { isSettled: boolean; isCancelled: boolean },
>(rows: T[], filter: ReceivableFilter): T[] {
  if (filter === "semua") return rows;
  if (filter === "lunas") return rows.filter((row) => row.isSettled);
  return rows.filter((row) => !row.isSettled && !row.isCancelled);
}

/** Jumlah per saringan, dipakai untuk angka di tombol filter. */
export function countByFilter<
  T extends { isSettled: boolean; isCancelled: boolean },
>(rows: T[],
): Record<ReceivableFilter, number> {
  return {
    aktif: rows.filter((row) => !row.isSettled && !row.isCancelled).length,
    lunas: rows.filter((row) => row.isSettled).length,
    semua: rows.length,
  };
}

/**
 * Status pelunasan dan keterlambatan untuk satu piutang.
 *
 * Terlambat berarti belum lunas, tidak dibatalkan, punya jatuh tempo, dan
 * tanggal jatuh tempo sudah lewat hari ini.
 */
export function overdueFlags(options: {
  dueAtDay: string | null;
  today: string;
  remaining: number;
  isCancelled: boolean;
}): { isSettled: boolean; isOverdue: boolean } {
  const isSettled = options.remaining <= 0;
  const isOverdue =
    !options.isCancelled &&
    !isSettled &&
    options.dueAtDay !== null &&
    options.dueAtDay < options.today;

  return { isSettled, isOverdue };
}