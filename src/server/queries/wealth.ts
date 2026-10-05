import "server-only";

import { getAccountBalances } from "@/server/queries/finance";
import { getReceivableSummary } from "@/server/queries/receivables";
import { calcWealth, type WealthSummary } from "@/lib/wealth";

/**
 * Rakit total kekayaan dari data yang sudah ada.
 *
 * Berada di berkas sendiri supaya tidak mengimpor `finance` dan `receivables`
 * saling bergantian, yang akan menimbulkan dependensi melingkar.
 */
export async function getWealthSummary(): Promise<WealthSummary> {
  const [accounts, receivables] = await Promise.all([
    // `true` karena uang di akun terarsip tetap milik pengguna.
    getAccountBalances({ includeArchived: true }),
    getReceivableSummary(),
  ]);

  return calcWealth({
    accountBalances: accounts,
    receivableOutstanding: receivables.totalOutstanding,
  });
}
