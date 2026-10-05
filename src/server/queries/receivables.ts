import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getTodayInputValue, monthToRange, toDateInputValue, type MonthKey } from "@/lib/date";

/**
 * Lapisan baca untuk piutang.
 *
 * Sisa piutang (`remaining`) selalu dihitung dari `amount` dikurangi jumlah
 * seluruh pembayaran, bukan disimpan sebagai kolom. Dengan begitu tidak ada
 * denyut yang bisa membuat angka sisa melenceng dari pembayarannya.
 */

const PAYMENT_INCLUDE = {
  transaction: { select: { id: true } },
} as const;

const RECEIVABLE_INCLUDE = Prisma.validator<Prisma.ReceivableInclude>()({
  payments: {
    orderBy: [{ receivedAt: "desc" }],
    include: PAYMENT_INCLUDE,
  },
  // Akun dan kategori ikut diambil supaya formulir ubah bisa memakai nilai
  // transaksi yang sama, bukan sekadar mengambil nilai pertama.
  lentTransaction: { select: { id: true, accountId: true, categoryId: true } },
});

export type ReceivablePaymentRow = {
  id: string;
  amount: number;
  receivedAt: Date;
  notes: string | null;
  transactionId: string | null;
};

export type ReceivableRow = {
  id: string;
  personName: string;
  title: string;
  amount: number;
  lentAt: Date;
  dueAt: Date | null;
  notes: string | null;
  isCancelled: boolean;
  lentTransactionId: string | null;
  /** Akun dan kategori dari transaksi kas yang terkait, untuk formulir ubah. */
  lentAccountId: string | null;
  lentCategoryId: string | null;
  paidTotal: number;
  remaining: number;
  /** Sisa sudah nol atau kurang, termasuk piutang yang dibatalkan. */
  isSettled: boolean;
  /** Sudah lewat jatuh tempo dan belum lunas. */
  isOverdue: boolean;
  /** Sisa hari menuju jatuh tempo. Negatif berarti sudah lewat. */
  daysToDue: number | null;
  payments: ReceivablePaymentRow[];
};

type ReceivableWithPayments = Prisma.ReceivableGetPayload<{
  include: typeof RECEIVABLE_INCLUDE;
}>;

/** Selisih hari antara dua tanggal `YYYY-MM-DD` tanpa terpengaruh zona waktu. */
function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const to = Date.parse(`${toDate}T00:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}

/**
 * Tambahkan sisa, status lunas, dan status jatuh tempo ke satu baris piutang.
 *
 * `remaining` tidak pernah disimpan di database, selalu dihitung ulang di sini
 * dari `amount` dikurangi seluruh pembayaran.
 */
function decorate(row: ReceivableWithPayments, today: string): ReceivableRow {
  const payments: ReceivablePaymentRow[] = row.payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    receivedAt: payment.receivedAt,
    notes: payment.notes,
    transactionId: payment.transactionId,
  }));

  const paidTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = row.amount - paidTotal;
  const dueDay = row.dueAt ? toDateInputValue(row.dueAt) : null;
  const isSettled = remaining <= 0;
  const isOverdue =
    !row.isCancelled && !isSettled && dueDay !== null && dueDay < today;

  return {
    id: row.id,
    personName: row.personName,
    title: row.title,
    amount: row.amount,
    lentAt: row.lentAt,
    dueAt: row.dueAt,
    notes: row.notes,
    isCancelled: row.isCancelled,
    lentTransactionId: row.lentTransactionId,
    lentAccountId: row.lentTransaction?.accountId ?? null,
    lentCategoryId: row.lentTransaction?.categoryId ?? null,
    paidTotal,
    remaining,
    isSettled,
    isOverdue,
    daysToDue: dueDay ? daysBetween(today, dueDay) : null,
    payments,
  };
}

/** Semua piutang dengan sisa, status jatuh tempo, dan riwayat pembayaran. */
export async function getReceivables(): Promise<ReceivableRow[]> {
  const today = getTodayInputValue();

  const rows = await db.receivable.findMany({
    include: RECEIVABLE_INCLUDE,
    orderBy: [{ lentAt: "desc" }],
  });

  const decorated = rows.map((row) => decorate(row, today));

  // Yang paling mendesak di atas: lewat jatuh tempo, belum lunas, lalu
  // jatuh tempo terdekat.
  return decorated.sort((a, b) => {
    const rank = (row: ReceivableRow) => {
      if (row.isCancelled) return 3;
      if (row.isOverdue) return 0;
      if (row.isSettled) return 2;
      return 1;
    };

    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;

    const aDays = a.daysToDue ?? Number.MAX_SAFE_INTEGER;
    const bDays = b.daysToDue ?? Number.MAX_SAFE_INTEGER;
    return aDays - bDays;
  });
}

export async function getReceivableById(
  id: string,
): Promise<ReceivableRow | null> {
  const today = getTodayInputValue();

  const row = await db.receivable.findUnique({
    where: { id },
    include: RECEIVABLE_INCLUDE,
  });

  return row ? decorate(row, today) : null;
}

export type ReceivableSummary = {
  totalOutstanding: number;
  totalLent: number;
  totalRepaid: number;
  overdueCount: number;
  overdueAmount: number;
  dueSoonCount: number;
  settledCount: number;
  activeCount: number;
};

/** Ringkasan untuk kartu statistik halaman piutang. */
export async function getReceivableSummary(
  receivables?: ReceivableRow[],
): Promise<ReceivableSummary> {
  const rows = receivables ?? (await getReceivables());

  const active = rows.filter((row) => !row.isCancelled);
  const dueSoonLimit = 30;

  let totalOutstanding = 0;
  let totalLent = 0;
  let totalRepaid = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let dueSoonCount = 0;
  let settledCount = 0;

  for (const row of active) {
    totalLent += row.amount;
    totalRepaid += row.paidTotal;

    if (row.isSettled) {
      settledCount += 1;
      continue;
    }

    totalOutstanding += row.remaining;

    if (row.isOverdue) {
      overdueCount += 1;
      overdueAmount += row.remaining;
    }

    if (row.daysToDue !== null && row.daysToDue >= 0 && row.daysToDue <= dueSoonLimit) {
      dueSoonCount += 1;
    }
  }

  return {
    totalOutstanding,
    totalLent,
    totalRepaid,
    overdueCount,
    overdueAmount,
    dueSoonCount,
    settledCount,
    activeCount: active.length,
  };
}

export type ReceivableFlow = { lent: number; repaid: number };

/**
 * Arus kas piutang pada satu bulan, diambil dari transaksi yang terhubung ke
 * piutang. Dipakai dashboard untuk memberi tahu berapa bagian dari
 * pengeluaran bulanan yang sebenarnya uang yang dipinjamkan, bukan dibelanjakan.
 */
export async function getReceivableFlow(monthKey: MonthKey): Promise<ReceivableFlow> {
  const { start, end } = monthToRange(monthKey);

  const [lent, repaid] = await Promise.all([
    db.transaction.aggregate({
      where: {
        kind: "EXPENSE",
        lentReceivable: { isNot: null },
        occurredAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        kind: "INCOME",
        paymentReceivable: { isNot: null },
        occurredAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
  ]);

  return { lent: lent._sum.amount ?? 0, repaid: repaid._sum.amount ?? 0 };
}