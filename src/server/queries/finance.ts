import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { monthToRange, type MonthKey } from "@/lib/date";
import { accountBalanceOf, safeSum } from "@/lib/money";
import type { TransactionKind } from "@/lib/types";

/**
 * Lapisan baca (query) yang dipakai semua halaman.
 *
 * Semua agregasi bulanan melewati `monthToRange()` sehingga batasnya konsisten
 * UTC dan transaksi tidak pernah terhitung ke bulan yang salah.
 */

export type MonthSummary = {
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
};

/** Total pemasukan, pengeluaran, dan bersih untuk satu bulan. */
export async function getMonthSummary(monthKey: MonthKey): Promise<MonthSummary> {
  const { start, end } = monthToRange(monthKey);

  const grouped = await db.transaction.groupBy({
    by: ["kind"],
    where: { occurredAt: { gte: start, lt: end } },
    _sum: { amount: true },
    _count: { _all: true },
  });

  let income = 0;
  let expense = 0;
  let transactionCount = 0;

  for (const row of grouped) {
    const total = row._sum.amount ?? 0;
    transactionCount += row._count._all;
    if (row.kind === "INCOME") income += total;
    else expense += total;
  }

  // `safeSum` dipakai untuk penjumlahan turunan (bukan kolom DB) supaya tidak
  // mungkin meleset melewati batas angka yang aman, lihat catatan di `money.ts`.
  const safeIncome = safeSum([income]);
  const safeExpense = safeSum([expense]);

  return {
    income: safeIncome,
    expense: safeExpense,
    net: safeIncome - safeExpense,
    transactionCount,
  };
}

export type CategoryBreakdownRow = {
  categoryId: string;
  name: string;
  color: string;
  kind: TransactionKind;
  total: number;
  count: number;
};

/** Total per kategori untuk satu bulan, diurutkan dari nominal terbesar. */
export async function getCategoryBreakdown(
  monthKey: MonthKey,
  kind?: TransactionKind,
): Promise<CategoryBreakdownRow[]> {
  const { start, end } = monthToRange(monthKey);

  const grouped = await db.transaction.groupBy({
    by: ["categoryId", "kind"],
    where: {
      occurredAt: { gte: start, lt: end },
      ...(kind ? { kind } : {}),
    },
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  if (grouped.length === 0) return [];

  // Nama & warna kategori diambil terpisah lalu di-join di memori karena
  // `groupBy` Prisma tidak bisa mengambil kolom relasi sekaligus.
  const categories = await db.category.findMany({
    where: { id: { in: grouped.map((row) => row.categoryId) } },
    select: { id: true, name: true, color: true },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return grouped.flatMap((row) => {
    const category = categoryMap.get(row.categoryId);
    if (!category) return [];

    return [
      {
        categoryId: row.categoryId,
        name: category.name,
        color: category.color,
        kind: row.kind as TransactionKind,
        total: row._sum.amount ?? 0,
        count: row._count._all,
      },
    ];
  });
}

export type AccountBalance = {
  id: string;
  name: string;
  type: string;
  /** LIQUID | SAVINGS | GOAL_FUND | EMERGENCY, atau null bila belum diisi. */
  purpose: string | null;
  initialBalance: number;
  income: number;
  expense: number;
  /** Total transfer yang masuk ke akun ini. */
  transferIn: number;
  /** Total transfer yang keluar dari akun ini. */
  transferOut: number;
  balance: number;
  isArchived: boolean;
};

/**
 * Saldo berjalan seluruh akun.
 *
 * Saldo = `initialBalance` + Σpemasukan − Σpengeluaran + ΣtransferMasuk − ΣtransferKeluar
 * (akumulasi sepanjang waktu, bukan hanya bulan berjalan).
 *
 * Transfer harus ikut dihitung, kalau tidak saldo akun tujuan akan selalu nol
 * padahal uangnya sudah pindah. Tapi transfer TIDAK boleh ikut menyumbang ke
 * `income` maupun `expense`, karena itu bukan pemasukan dan bukan pengeluaran —
 * hanya perpindahan. Kalau tercampur ke sana, cashflow dan saving rate jadi bohong.
 *
 * `includeArchived` menentukan apakah akun terarsip ikut dikembalikan.
 * Arsip hanya berarti "sembunyi dari form", bukan "uangnya hilang", jadi
 * perhitungan total kekayaan selalu meminta `true`.
 */
export async function getAccountBalances(
  options: { includeArchived?: boolean } = {},
): Promise<AccountBalance[]> {
  const { includeArchived = false } = options;

  const [accounts, grouped, outgoing, incoming] = await Promise.all([
    db.account.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { createdAt: "asc" },
    }),
    db.transaction.groupBy({
      by: ["accountId", "kind"],
      _sum: { amount: true },
    }),
    // Dikelompokkan lewat `groupBy` pada kolom foreign key supaya hasilnya
    // bisa langsung dijumlahkan per akun tanpa menarik semua baris transfer.
    db.transfer.groupBy({
      by: ["fromAccountId"],
      _sum: { amount: true },
    }),
    db.transfer.groupBy({
      by: ["toAccountId"],
      _sum: { amount: true },
    }),
  ]);

  const totals = new Map<string, { income: number; expense: number }>();

  for (const row of grouped) {
    const current = totals.get(row.accountId) ?? { income: 0, expense: 0 };
    // Penumpukan per akun juga dijaga agar tetap di dalam rentang angka aman.
    if (row.kind === "INCOME") current.income = safeSum([current.income, row._sum.amount ?? 0]);
    else current.expense = safeSum([current.expense, row._sum.amount ?? 0]);
    totals.set(row.accountId, current);
  }

  const outMap = new Map(outgoing.map((row) => [row.fromAccountId, row._sum.amount ?? 0]));
  const inMap = new Map(incoming.map((row) => [row.toAccountId, row._sum.amount ?? 0]));

  return accounts.map((account) => {
    const { income, expense } = totals.get(account.id) ?? { income: 0, expense: 0 };
    const transferIn = inMap.get(account.id) ?? 0;
    const transferOut = outMap.get(account.id) ?? 0;

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      purpose: account.purpose,
      initialBalance: account.initialBalance,
      income,
      expense,
      transferIn,
      transferOut,
      // Rumus saldo dihitung lewat `accountBalanceOf` supaya hanya ada satu
      // definisi di seluruh aplikasi dan penjumlahannya aman.
      balance: accountBalanceOf({
        initialBalance: account.initialBalance,
        income,
        expense,
        transferIn,
        transferOut,
      }),
      isArchived: account.isArchived,
    };
  });
}

const TRANSACTION_INCLUDE = Prisma.validator<Prisma.TransactionInclude>()({
  account: { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, color: true, kind: true } },
});

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof TRANSACTION_INCLUDE;
}>;

/** Enam transaksi terakhir, tanpa kunci bulan. */
export async function getRecentTransactions(
  take = 5,
): Promise<TransactionWithRelations[]> {
  return db.transaction.findMany({
    include: TRANSACTION_INCLUDE,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take,
  });
}

export type TransactionFilters = {
  monthKey: MonthKey;
  kind?: TransactionKind;
  categoryId?: string;
  accountId?: string;
  keyword?: string;
  page: number;
  pageSize?: number;
};

export type TransactionListResult = {
  items: TransactionWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const DEFAULT_PAGE_SIZE = 20;

/** Daftar transaksi dengan filter dan paginasi, untuk halaman `/transaksi`. */
export async function getTransactions(
  filters: TransactionFilters,
): Promise<TransactionListResult> {
  const { start, end } = monthToRange(filters.monthKey);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, filters.page);
  const keyword = filters.keyword?.trim();

  const where = {
    occurredAt: { gte: start, lt: end },
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    // `contains` tanpa `mode` bersifat case-sensitive. Setelah migrasi ke
    // PostgreSQL, opsi `mode: "insensitive"` sudah tersedia di Prisma; dipakai
    // di sini supaya pencarian juga menjangkau huruf besar di teks Indonesia.
    ...(keyword ? { description: { contains: keyword, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: TRANSACTION_INCLUDE,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.transaction.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Ambil satu transaksi beserta relasinya, atau `null` bila tidak ada. */
export async function getTransactionById(
  id: string,
): Promise<TransactionWithRelations | null> {
  return db.transaction.findUnique({ where: { id }, include: TRANSACTION_INCLUDE });
}

/** Akun aktif untuk dipilih di form transaksi. */
export function getActiveAccounts() {
  return db.account.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "asc" },
  });
}

/** Kategori aktif, difilter per jenis transaksi. */
export function getActiveCategories(kind?: TransactionKind) {
  return db.category.findMany({
    where: { isArchived: false, ...(kind ? { kind } : {}) },
    orderBy: { name: "asc" },
  });
}

/** Akun lengkap dengan flag apakah masih dipakai transaksi. */
export async function getAccountsWithUsage() {
  const [accounts, usage] = await Promise.all([
    db.account.findMany({ orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }] }),
    db.transaction.groupBy({ by: ["accountId"], _count: { _all: true } }),
  ]);

  const counts = new Map(usage.map((row) => [row.accountId, row._count._all]));

  return accounts.map((account) => ({
    ...account,
    transactionCount: counts.get(account.id) ?? 0,
  }));
}

/** Kategori lengkap dengan flag apakah masih dipakai transaksi. */
export async function getCategoriesWithUsage(kind?: TransactionKind) {
  const [categories, usage] = await Promise.all([
    db.category.findMany({
      where: kind ? { kind } : {},
      orderBy: [{ kind: "asc" }, { isArchived: "asc" }, { name: "asc" }],
    }),
    db.transaction.groupBy({ by: ["categoryId"], _count: { _all: true } }),
  ]);

  const counts = new Map(usage.map((row) => [row.categoryId, row._count._all]));

  return categories.map((category) => ({
    ...category,
    transactionCount: counts.get(category.id) ?? 0,
  }));
}