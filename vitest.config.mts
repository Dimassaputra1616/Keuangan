import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Konfigurasi Vitest.
 *
 * Hanya menguji logika murni (uang, tanggal, aturan piutang, skema validasi).
 * Semua berkas itu bebas impor server/database, jadi tidak perlu mock Prisma
 * maupun setup database — test jadi cepat dan deterministik.
 *
 * Alias `@` disamakan dengan `tsconfig.json` supaya berkas tes bisa mengimpor
 * modul aplikasi dengan jalur yang sama seperti kode produksi.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Zola: proyek ini punya 0 dependensi runtime, jadiCoverage cepat.
    coverage: {
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/types.ts", "src/lib/db.ts"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});