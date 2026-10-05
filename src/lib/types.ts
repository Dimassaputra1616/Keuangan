/**
 * Konstanta domain bersama.
 *
 * Prisma tidak mendukung `enum` pada SQLite, jadi field enum di database disimpan
 * sebagai `String`. File ini adalah sumber kebenaran kedua (satu-satunya yang
 * bersifat runtime) dan dipakai bersama zod di `src/lib/validations/` sebagai
 * lapis validasi pertama.
 */

export const TRANSACTION_KINDS = ["INCOME", "EXPENSE"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const ACCOUNT_TYPES = ["TUNAI", "BANK", "EWALLET", "KREDIT"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Peran akun, terpisah dari `Account.type`.
 *
 * `type` menjawab "bentuk Apa accountnya" (tunai, bank, e-wallet),
 * sedangkan `purpose` menjawab "uangnya boleh dipakai buat apa" — dan itulah
 * yang menentukan apakah saldonya masuk hitungan uang aman digunakan.
 *
 * `LIQUID`   uang harian yang bebas dibelanjakan
 * `SAVINGS`  ditabung, tapi bukan untuk tujuan tertentu
 * `GOAL_FUND` terkunci untuk sebuah target (dana nikah, sinking fund)
 * `EMERGENCY` dana darurat
 *
 * Akun yang belum diisi `purpose` dianggap `LIQUID`, supaya akun lama yang
 * dibuat sebelum fitur ini tetap masuk hitungan.
 */
export const ACCOUNT_PURPOSES = [
  "LIQUID",
  "SAVINGS",
  "GOAL_FUND",
  "EMERGENCY",
] as const;
export type AccountPurpose = (typeof ACCOUNT_PURPOSES)[number];

export const ACCOUNT_PURPOSE_LABELS: Record<AccountPurpose, string> = {
  LIQUID: "Uang Harian",
  SAVINGS: "Tabungan",
  GOAL_FUND: "Dana Tujuan",
  EMERGENCY: "Dana Darurat",
};

/** Penjelasan singkat yang ditampilkan di bawah pilihan peran akun. */
export const ACCOUNT_PURPOSE_HINTS: Record<AccountPurpose, string> = {
  LIQUID: "Bebas dipakai untuk belanja harian",
  SAVINGS: "Disimpan, bukan untuk tujuan tertentu",
  GOAL_FUND: "Dikunci untuk sebuah target",
  EMERGENCY: "Dana darurat, tidak dibelanjakan",
};

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  TUNAI: "Tunai",
  BANK: "Bank",
  EWALLET: "E-Wallet",
  KREDIT: "Kartu Kredit",
};

export function isTransactionKind(value: unknown): value is TransactionKind {
  return (
    typeof value === "string" &&
    (TRANSACTION_KINDS as readonly string[]).includes(value)
  );
}

export function isAccountType(value: unknown): value is AccountType {
  return (
    typeof value === "string" &&
    (ACCOUNT_TYPES as readonly string[]).includes(value)
  );
}

export function isAccountPurpose(value: unknown): value is AccountPurpose {
  return (
    typeof value === "string" &&
    (ACCOUNT_PURPOSES as readonly string[]).includes(value)
  );
}

/**
 * Bentuk balik untuk Server Action yang dipanggil lewat `useActionState`.
 * `errors` berisi pesan per-field agar bisa ditampilkan inline di bawah input.
 */
/** Pesan validasi per-field, mengikuti bentuk `zod` `flatten().fieldErrors`. */
export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message?: string; errors?: FieldErrors };

export function actionError(
  message: string,
  errors?: FieldErrors,
): ActionResult {
  return { ok: false, message, errors };
}

/** Ubah error Prisma menjadi kalimat Bahasa Indonesia yang bisa dibaca pengguna. */
export function describePrismaError(error: unknown): string {
  if (!(error instanceof Error)) return "Terjadi kesalahan yang tidak diketahui.";

  // Pelanggaran unique constraint
  if (error.message.includes("Unique constraint failed")) {
    return "Data dengan nama serupa sudah ada. Pilih nama lain.";
  }
  // Pelanggaran foreign key (onDelete: Restrict)
  if (error.message.includes("Foreign key constraint")) {
    return "Data masih dipakai oleh transaksi lain sehingga tidak bisa dihapus.";
  }
  // Nilai di luar rentang INTEGER 32-bit
  if (error.message.includes("out of range") || error.message.includes("integer")) {
    return "Nilai terlalu besar untuk disimpan. Nilai maksimal adalah Rp 2.147.483.647.";
  }
  if (error.message.includes("no such table")) {
    return "Database belum siap. Jalankan `npm run db:migrate` lalu `npm run db:seed`.";
  }
  return "Gagal menyimpan data. Coba ulangi sekali lagi.";
}