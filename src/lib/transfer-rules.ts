import { MAX_RUPIAH } from "@/lib/money";

/**
 * Aturan bisnis transfer antar akun (murni, tanpa akses database).
 *
 * Transfer dicatat di tabel `Transfer`, bukan sebagai dua baris `Transaction`.
 * Alasannya menagih spec §9: transfer bukan pemasukan dan bukan pengeluaran,
 * hanya berubah bentuk uang. Kalau ia jadi income + expense, cashflow dan
 * saving rate ikut bohong.
 *
 * Modul ini dipisah supaya aturannya bisa diuji tanpa Server Action, mengikuti
 * pola `receivable-rules.ts`.
 */

/** Transfer tidak boleh berpindah ke akun yang sama dengan akun asal. */
export function checkTransferAccounts(
  fromAccountId: string,
  toAccountId: string,
): string | null {
  if (!fromAccountId) return "Akun asal wajib dipilih.";
  if (!toAccountId) return "Akun tujuan wajib dipilih.";

  if (fromAccountId === toAccountId) {
    return "Akun tujuan harus berbeda dari akun asal.";
  }

  return null;
}

/** Validasi nominal transfer: positif, bulat, dan muat di INTEGER 32-bit. */
export function checkTransferAmount(amount: number): string | null {
  if (!Number.isInteger(amount) || amount <= 0) {
    return "Nominal harus berupa angka positif.";
  }

  if (amount > MAX_RUPIAH) {
    return "Nominal maksimal Rp 2.147.483.647.";
  }

  return null;
}

export type TransferImpact = {
  /** Apakah total aset berubah? Selalu `0` untuk transfer yang valid. */
  netAssetChange: number;
  /** Pengaruh ke laporan arus kas bulan berjalan. */
  incomeImpact: number;
  expenseImpact: number;
  /** Saldo akun asal bertambah (positif) atau berkurang (negatif). */
  fromDelta: number;
  /** Saldo akun tujuan bertambah (positif) atau berkurang (negatif). */
  toDelta: number;
};

/**
 * Dampak satu transfer terhadap saldo dan laporan.
 *
 * Fungsi ini adalah tempat(double counting) dicegah: `netAssetChange` selalu nol
 * dan income/expense selalu nol, sehingga transfer tidak pernah ikut menghitung
 * pemasukan maupun pengeluaran. Dipakai juga oleh tes untuk mengunci aturan ini.
 */
export function transferImpact(amount: number): TransferImpact {
  return {
    netAssetChange: 0,
    incomeImpact: 0,
    expenseImpact: 0,
    fromDelta: -amount,
    toDelta: amount,
  };
}

/**
 * Gabungkan dampak beberapa transfer menjadi satu.
 *
 * Dipakai query saldo akun: satu akun bisa jadi sumber sekaligus tujuan dari
 * transfer berbeda, jadi perhitungannya harus dijumlahkan, bukan ditimpa.
 */
export function sumTransferImpacts(
  impacts: TransferImpact[],
): TransferImpact {
  let netAssetChange = 0;
  let incomeImpact = 0;
  let expenseImpact = 0;
  let fromDelta = 0;
  let toDelta = 0;

  for (const impact of impacts) {
    netAssetChange += impact.netAssetChange;
    incomeImpact += impact.incomeImpact;
    expenseImpact += impact.expenseImpact;
    fromDelta += impact.fromDelta;
    toDelta += impact.toDelta;
  }

  return { netAssetChange, incomeImpact, expenseImpact, fromDelta, toDelta };
}
