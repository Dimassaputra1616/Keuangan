/**
 * Perhitungan total kekayaan.
 *
 * Total kekayaan = uang cash di semua akun + piutang yang masih bisa ditagih.
 *
 * Modul ini murni (tanpa akses database) supaya rumus dan kebijakan
 * penghitungannya bisa diuji langsung, terpisah dari query.
 *
 * Kebijakan penting: akun terarsip tetap dihitung. Arsip hanya berarti akun itu
 * disembunyikan dari pilihan form, bukan berarti uangnya hilang. Mengabaikannya
 * akan membuat total kekayaan kurang dari kenyataan.
 */

import { safeSum } from "@/lib/money";

export type WealthAccount = {
  balance: number;
  isArchived: boolean;
};

export type WealthInput = {
  accountBalances: WealthAccount[];
  /** Sisa piutang yang belum lunas dan belum dibatalkan. */
  receivableOutstanding: number;
};

export type WealthSummary = {
  /** Cash seluruh akun, terarsip ikut dihitung. */
  cash: number;
  /** Bagian cash yang berasal dari akun terarsip. */
  archivedCash: number;
  /** Cash dari akun yang masih aktif. */
  activeCash: number;
  receivable: number;
  total: number;
  accountCount: number;
  archivedCount: number;
  /** Total negatif berarti ada utang yang lebih besar dari aset. */
  isNegative: boolean;
};

export function calcWealth({
  accountBalances,
  receivableOutstanding,
}: WealthInput): WealthSummary {
  let cash = 0;
  let archivedCash = 0;

  // Menjumlahkan banyak akun bisa melampaui batas angka yang aman kalau saldonya
  // sendiri sudah besar, jadi penjumlahannya dijaga dengan `safeSum`.
  for (const account of accountBalances) {
    cash = safeSum([cash, account.balance]);
    if (account.isArchived) archivedCash = safeSum([archivedCash, account.balance]);
  }

  const total = safeSum([cash, receivableOutstanding]);

  return {
    cash,
    archivedCash,
    activeCash: cash - archivedCash,
    receivable: receivableOutstanding,
    total,
    accountCount: accountBalances.length,
    archivedCount: accountBalances.filter((account) => account.isArchived).length,
    isNegative: total < 0,
  };
}
