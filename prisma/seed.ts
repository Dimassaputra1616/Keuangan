import { PrismaClient } from "@prisma/client";

/**
 * Seed data awal.
 *
 * Idempoten: aman dijalankan berulang karena setiap baris di-upsert lewat
 * unique constraint `@@unique([name, kind])` pada Category.
 */

const prisma = new PrismaClient();

const EXPENSE_CATEGORIES: Array<{ name: string; color: string }> = [
  { name: "Makan & Minum", color: "#f97316" },
  { name: "Transportasi", color: "#0ea5e9" },
  { name: "Tagihan & Utilitas", color: "#6366f1" },
  { name: "Belanja", color: "#ec4899" },
  { name: "Hiburan", color: "#a855f7" },
  { name: "Kesehatan", color: "#14b8a6" },
  { name: "Pendidikan", color: "#3b82f6" },
  // Uang yang keluar sebagai piutang. Pembayarannya dicatat sebagai pemasukan
  // dengan kategori bernama sama, sehingga sisa piutang bisa direkonsiliasi dari
  // satu sumber data.
  { name: "Piutang", color: "#f43f5e" },
  { name: "Lain-lain", color: "#64748b" },
];

const INCOME_CATEGORIES: Array<{ name: string; color: string }> = [
  { name: "Gaji", color: "#22c55e" },
  { name: "Bonus", color: "#16a34a" },
  { name: "Warisan", color: "#ca8a04" },
  { name: "Piutang", color: "#f43f5e" },
  { name: "Lain-lain", color: "#64748b" },
];

async function main() {
  for (const category of EXPENSE_CATEGORIES) {
    await prisma.category.upsert({
      where: { name_kind: { name: category.name, kind: "EXPENSE" } },
      update: { color: category.color },
      create: { name: category.name, kind: "EXPENSE", color: category.color },
    });
  }

  for (const category of INCOME_CATEGORIES) {
    await prisma.category.upsert({
      where: { name_kind: { name: category.name, kind: "INCOME" } },
      update: { color: category.color },
      create: { name: category.name, kind: "INCOME", color: category.color },
    });
  }

  const existingAccount = await prisma.account.findFirst({
    where: { name: "Dompet Tunai" },
  });

  if (!existingAccount) {
    await prisma.account.create({
      data: { name: "Dompet Tunai", type: "TUNAI", initialBalance: 0 },
    });
  }

  const categoryCount = await prisma.category.count();
  const accountCount = await prisma.account.count();

  console.log(
    `Seed selesai: ${categoryCount} kategori, ${accountCount} akun.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });