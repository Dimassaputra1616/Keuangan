import { PrismaClient } from "@prisma/client";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

/**
 * Backup database SQLite.
 *
 * Dipakai lewat `npm run db:backup`.
 *
 * Kenapa bukan `cp` biasa? SQLite menulis ke berkas lewat halaman, jadi menyalin
 * berkasnya saat dev server sedang aktif bisa menghasilkan salinan yang tidak
 * konsisten (-half-written). Perintah `VACUUM INTO` membuat salinan dari isi
 * database yang sudah dijamin konsisten oleh SQLite, dan berjalan aman meski
 * ada penulisan yang sedang berlangsung.
 *
 * Hasil disimpan di `prisma/backups/` dengan nama bercap waktu, dan hanya 10
 * backup terbaru yang dipertahankan supaya folder tidak tumbuh tanpa batas.
 */

const PRISMA_DIR = resolve(process.cwd(), "prisma");
const BACKUP_DIR = resolve(PRISMA_DIR, "backups");
const KEEP_LATEST = 10;

/** Baca `DATABASE_URL` dari environment, lalu fallback ke berkas `.env`. */
function readDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    throw new Error(
      "DATABASE_URL tidak ditemukan di environment maupun berkas .env.",
    );
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/.exec(line);
    if (match) return match[1].replace(/^["']|["']$/g, "");
  }

  throw new Error("DATABASE_URL tidak ditemukan di berkas .env.");
}

/**
 * Ubah `DATABASE_URL` menjadi path absolut berkas database.
 *
 * Path relatif pada `DATABASE_URL` Prisma tidak diselesaikan terhadap working
 * directory, melainkan terhadap lokasi `schema.prisma` — jadi `file:./dev.db`
 * berarti `prisma/dev.db`, bukan `./dev.db`. Aturan yang sama ditirukan di sini
 * supaya skrip tidak salah resolve.
 */
function resolveSqlitePath(url: string): string {
  if (!url.startsWith("file:")) {
    throw new Error(
      `Backup ini hanya mendukung SQLite (DATABASE_URL harus diawali "file:"), dapat: ${url}`,
    );
  }

  const raw = url.slice("file:".length);
  return isAbsolute(raw) ? raw : resolve(PRISMA_DIR, raw);
}

/** Buang backup lama, sisakan `KEEP_LATEST` yang terbaru. */
function pruneOldBackups(): number {
  const files = readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith(".db"))
    // Nama memuat timestamp, jadi urutan leksikografis = urutan waktu.
    .sort();

  const stale = files.slice(0, Math.max(0, files.length - KEEP_LATEST));

  for (const name of stale) {
    try {
      unlinkSync(join(BACKUP_DIR, name));
      console.log(`  membuang backup lama: ${name}`);
    } catch {
      // Kalau gagal hapus, backup lama yang tersisa hanya membebani disk —
      // bukan alasan membatalkan backup yang baru saja berhasil.
    }
  }

  return stale.length;
}

async function main() {
  const source = resolveSqlitePath(readDatabaseUrl());

  if (!existsSync(source)) {
    throw new Error(
      `Berkas database tidak ditemukan: ${source}\nJalankan \`npm run db:migrate\` dulu.`,
    );
  }

  mkdirSync(BACKUP_DIR, { recursive: true });

  // Timestamp dengan milidetik supaya dua backup berdekatan tidak menabrak nama.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = join(BACKUP_DIR, `dev-${stamp}.db`);

  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `VACUUM INTO '${destination.replace(/'/g, "''")}'`,
    );
  } finally {
    await prisma.$disconnect();
  }

  const { size } = statSync(destination);

  console.log(`Backup selesai`);
  console.log(`  dari : ${source}`);
  console.log(`  ke   : ${destination}`);
  console.log(`  ukuran: ${(size / 1024).toFixed(1)} KB`);

  const removed = pruneOldBackups();
  if (removed > 0) {
    console.log(`  ${removed} backup lama dibersihkan (sisanya ${KEEP_LATEST}).`);
  }
}

main().catch((error: unknown) => {
  console.error("Backup gagal:", error instanceof Error ? error.message : error);
  process.exit(1);
});