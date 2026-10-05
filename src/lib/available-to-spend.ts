import { isAccountPurpose, type AccountPurpose } from "@/lib/types";

/**
 * Perhitungan "Uang Aman Digunakan" (Available to Spend).
 *
 * Ini adalah jawaban atas pertanyaan "uang saya sekarang sebenarnya berapa?".
 * Bedanya dengan total kekayaan: **tidak semua saldo itu boleh dibelanjakan.**
 * Uang yang sudah dialokasikan ke Dana Nikah, Dana Darurat, atau sinking fund
 * masih milik user, tapi bukan uang bebas — memakainya berarti membatalkan
 * tujuan yang sudah dia tetapkan sendiri.
 *
 * Murni (tanpa database) supaya bisa diuji langsung, dan supaya angkanya bisa
 * diaudit lewat tes: setiap pengurang diperiksa satu per satu, bukan sekadar
 * satu hasil hitung yang tidak dijelaskan.
 *
 * Catatan anti-double-counting: fungsi ini hanya menghitung selisih terhadap
 * total kekayaan. Ia tidak menambahkan goal atau sinking fund sebagai sumber
 * angka tersendiri, karena uangnya sudah termasuk di dalam saldo akun.
 */

export type AvailableAccount = {
  balance: number;
  /** `null` berarti belum ditentukan; dianggap `LIQUID`. */
  purpose: string | null;
  isArchived: boolean;
};

export type AvailableToSpendInput = {
  accounts: AvailableAccount[];
  /**
   * Sisa piutang yang lewat jatuh tempo. Uang ini secara teknis masih aset, tapi
   * sudah diketahui akan dipakai untuk menutup utang, jadi tidak bisa dianggap
   * bebas.
   */
  overdueReceivable: number;
  /**
   * Saldo yang sudah dikunci di seluruh goal aktif. Dihitung dari
   * `GoalContribution` (lihat Phase 3), bukan kolom terpisah, supaya tidak
   * bisa melenceng dari pembayarannya.
   */
  reservedGoals: number;
  /**
   * Saldo seluruh sinking fund. Tidak boleh dihitung sebagai uang bebas karena
   * sudah earmark untuk pengeluaran berkala.
   */
  reservedSinkingFunds: number;
  /**
   * Sisa budget bulan berjalan yang belum dialokasikan ke tujuan lain. phase 2
   * dan 6 mengisinya; sementara ini selalu 0.
   */
  unallocatedBudget: number;
};

export type ReservedBreakdown = {
  goal: number;
  sinkingFund: number;
  receivable: number;
  budget: number;
};

export type AvailableToSpendSummary = {
  /** Saldo seluruh akun. Akun terarsip ikut dihitung, seperti total kekayaan. */
  totalCash: number;
  /** Bagian saldo yang benar-benar boleh dibelanjakan. */
  liquidCash: number;
  /** Saldo yang sengaja ditahan, dirinci per alasan. */
  reserved: ReservedBreakdown;
  /** Total yang ditahan. */
  reservedTotal: number;
  /** Sisa yang boleh dibelanjakan. */
  available: number;
  /** True bila liquid cash tidak cukup menutup semua tanggungan. */
  isShort: boolean;
};

/**
 * Perlakukan akun tanpa `purpose` sebagai `LIQUID`.
 *
 * Akun yang dibuat sebelum fitur ini ada tidak punya peran, dan menghilangkannya
 * dari hitungan akan membuat angka "uang aman" tiba-tiba turun.
 */
export function resolvePurpose(purpose: string | null): AccountPurpose {
  return isAccountPurpose(purpose) ? purpose : "LIQUID";
}

export function calcAvailableToSpend({
  accounts,
  overdueReceivable,
  reservedGoals,
  reservedSinkingFunds,
  unallocatedBudget,
}: AvailableToSpendInput): AvailableToSpendSummary {
  let totalCash = 0;
  let liquidCash = 0;

  for (const account of accounts) {
    totalCash += account.balance;

    const purpose = resolvePurpose(account.purpose);

    // Hanya LIQUID dan SAVINGS yang masih bisa dipakai bebas. GOAL_FUND dan
    // EMERGENCY justru itu tujuan keberadaannya, jadi tidak masuk hitungan.
    if (purpose === "LIQUID" || purpose === "SAVINGS") {
      liquidCash += account.balance;
    }
  }

  const reserved: ReservedBreakdown = {
    goal: Math.max(0, reservedGoals),
    sinkingFund: Math.max(0, reservedSinkingFunds),
    receivable: Math.max(0, overdueReceivable),
    budget: Math.max(0, unallocatedBudget),
  };

  const reservedTotal =
    reserved.goal + reserved.sinkingFund + reserved.receivable + reserved.budget;

  const available = liquidCash - reservedTotal;

  return {
    totalCash,
    liquidCash,
    reserved,
    reservedTotal,
    available,
    isShort: available < 0,
  };
}

/**
 * Kalimat penjelasan singkat untuk kartu "Uang Aman Digunakan".
 *
 * Gunanya supaya angka yang terasa membingungkan itu selalu bisa ditelusuri: user
 * melihat dari mana saja uangnya ditahan, bukan cuma hasil akhir yang misterius.
 */
export function describeReserved(breakdown: ReservedBreakdown): string[] {
  const parts: string[] = [];

  if (breakdown.goal > 0) parts.push("terkunci di target");
  if (breakdown.sinkingFund > 0) parts.push("disimpan untuk dana berkala");
  if (breakdown.receivable > 0) parts.push("menutup piutang jatuh tempo");
  if (breakdown.budget > 0) parts.push("sisa budget bulan ini");

  return parts;
}
