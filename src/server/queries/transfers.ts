import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { monthToRange, type MonthKey } from "@/lib/date";

/**
 * Lapisan baca untuk transfer antar akun.
 *
 * Transfer tidak masuk ke laporan arus kas (lihat `transfer-rules.ts`), tapi
 * tetap perlu ditampilkan supaya user bisa mengaudit ke mana uangnya dipindah.
 */

const TRANSFER_INCLUDE = Prisma.validator<Prisma.TransferInclude>()({
  fromAccount: { select: { id: true, name: true, type: true } },
  toAccount: { select: { id: true, name: true, type: true } },
});

export type TransferWithAccounts = Prisma.TransferGetPayload<{
  include: typeof TRANSFER_INCLUDE;
}>;

/** Transfer terbaru untuk satu bulan, tanpa kunci bulan bila `monthKey` kosong. */
export async function getTransfers(
  monthKey?: MonthKey,
  take = 20,
): Promise<TransferWithAccounts[]> {
  const range = monthKey ? monthToRange(monthKey) : null;

  return db.transfer.findMany({
    where: range
      ? { occurredAt: { gte: range.start, lt: range.end } }
      : undefined,
    include: TRANSFER_INCLUDE,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take,
  });
}

/** Jumlah transfer pada satu bulan, dipakai ringkasan dashboard. */
export async function getTransferCount(monthKey: MonthKey): Promise<number> {
  const { start, end } = monthToRange(monthKey);

  return db.transfer.count({
    where: { occurredAt: { gte: start, lt: end } },
  });
}
