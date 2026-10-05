import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // `.next-build` wajib ikut diabaikan: `next build` menulis ke folder itu
    // (lihat `distDir` di next.config.ts). Tanpa baris ini, hasil build
    // produksi ikut terlintas dan thousands of error palsu muncul begitu
    // `npm run build` pernah dijalankan.
    ignores: [
      ".next/**",
      ".next-build/**",
      "node_modules/**",
      "next-env.d.ts",
      "prisma/backups/**",
    ],
  },
];

export default eslintConfig;