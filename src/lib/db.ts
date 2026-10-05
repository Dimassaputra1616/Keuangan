import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient.
 *
 * Next.js memuat ulang modul saat hot reload di mode development. Tanpa singleton
 * ini setiap reload membuat koneksi baru ke SQLite sampai habis. Kita simpan
 * instance di `globalThis` saat NODE_ENV !== production agar dipakai ulang.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}