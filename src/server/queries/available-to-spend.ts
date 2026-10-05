import "server-only";

import { db } from "@/lib/db";
import { getAccountBalances } from "@/server/queries/finance";
import { getReceivables } from "@/server/queries/receivables";
import {
  calcAvailableToSpend,
  type AvailableToSpendSummary,
} from "@/lib/available-to-spend";

/**
 * Ringkasan "Uang Aman Digunakan" untuk dashboard.
 *
 * `reservedGoals` dan `reservedSinkingFunds` belum terisi di Phase 1 — tabelnya
 * baru ada di phase berikutnya. Keduanya sengaja diisi 0 supaya rumus di sini
 * sudah final dan tidak perlu diubah lagi nanti.
 *
 * Hanya piutang yang sudah lewat jatuh tempo yang dikurangi. Piutang yang
 * masih aktif tetap dihitung sebagai aset, tapi uangnya sudah diketahui akan
 * dipakai untuk menutup utang, jadi bukan uang yang bebas dibelanjakan.
 */
export async function getAvailableToSpend(): Promise<AvailableToSpendSummary> {
  const [accounts, receivables] = await Promise.all([
    getAccountBalances({ includeArchived: true }),
    getReceivables(),
  ]);

  const overdueReceivable = receivables
    .filter((row) => row.isOverdue)
    .reduce((sum, row) => sum + row.remaining, 0);

  return calcAvailableToSpend({
    accounts: accounts.map((account) => ({
      balance: account.balance,
      purpose: account.purpose,
      isArchived: account.isArchived,
    })),
    overdueReceivable,
    reservedGoals: 0,
    reservedSinkingFunds: 0,
    unallocatedBudget: 0,
  });
}

/** Total seluruh saldo akun. Dipakai untuk rekonsiliasi dengan total kekayaan. */
export async function getTotalCash(): Promise<number> {
  const accounts = await getAccountBalances({ includeArchived: true });
  return accounts.reduce((sum, account) => sum + account.balance, 0);
}

// `db` ikut diimpor agar modul ini gagal cepat bila Prisma belum di-generate,
// bukan diam-diam mengembalikan nol.
void db;
