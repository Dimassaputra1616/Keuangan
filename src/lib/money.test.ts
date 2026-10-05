import { describe, expect, it } from "vitest";
import {
  MAX_RUPIAH,
  MAX_SAFE_RUPIAH,
  accountBalanceOf,
  formatInputAmount,
  formatNumber,
  formatRupiah,
  isValidRupiah,
  parseRupiahInput,
  parseSignedRupiahInput,
  percentage,
  safeSum,
  signedAmount,
} from "@/lib/money";

/**
 * `Intl` menyisipkan non-breaking space (U+00A0) di antara simbol mata uang dan
 * angka. Normalisasi dulu supaya assertion tidak rapuh.
 */
const normalize = (value: string) => value.replace(/\u00a0/g, " ");

describe("formatRupiah", () => {
  it("memformat rupiah penuh dengan pemisah ribuan", () => {
    expect(normalize(formatRupiah(1_250_000))).toBe("Rp 1.250.000");
  });

  it("tidak pernah menampilkan sen", () => {
    expect(normalize(formatRupiah(900))).toBe("Rp 900");
  });

  it("bekerja pada nominal negatif", () => {
    expect(normalize(formatRupiah(-50_000))).toBe("-Rp 50.000");
  });
});

describe("formatNumber / formatInputAmount", () => {
  it("menambah pemisah ribuan tanpa simbol mata uang", () => {
    expect(formatNumber(1_250_000)).toBe("1.250.000");
    expect(formatInputAmount(1_250_000)).toBe("1.250.000");
  });
});

describe("parseRupiahInput", () => {
  it("menerima input dengan dan tanpa pemisah ribuan", () => {
    expect(parseRupiahInput("1.250.000")).toBe(1_250_000);
    expect(parseRupiahInput("1250000")).toBe(1_250_000);
  });

  it("membuang tanda minus karena model data tidak punya nominal negatif", () => {
    expect(parseRupiahInput("-5000")).toBe(5_000);
  });

  it("mengembalikan null untuk input kosong atau bukan angka", () => {
    expect(parseRupiahInput("")).toBeNull();
    expect(parseRupiahInput("   ")).toBeNull();
    expect(parseRupiahInput("abc")).toBeNull();
    expect(parseRupiahInput(null)).toBeNull();
    expect(parseRupiahInput(undefined)).toBeNull();
  });

  it("menolak nominal di atas batas kolom INTEGER 32-bit", () => {
    expect(parseRupiahInput(String(MAX_RUPIAH))).toBe(MAX_RUPIAH);
    expect(parseRupiahInput(String(MAX_RUPIAH + 1))).toBeNull();
  });
});

describe("parseSignedRupiahInput", () => {
  it("menganggap input kosong sebagai nol", () => {
    expect(parseSignedRupiahInput("")).toBe(0);
    expect(parseSignedRupiahInput(null)).toBeNull();
  });

  it("mempertahankan tanda minus untuk saldo awal akun", () => {
    expect(parseSignedRupiahInput("-5000")).toBe(-5_000);
    expect(parseSignedRupiahInput("-1.000.000")).toBe(-1_000_000);
    expect(parseSignedRupiahInput("1.000.000")).toBe(1_000_000);
    expect(parseSignedRupiahInput("0")).toBe(0);
  });

  it("menolak nilai yang tidak muat di INTEGER 32-bit", () => {
    expect(parseSignedRupiahInput(String(MAX_RUPIAH))).toBe(MAX_RUPIAH);
    expect(parseSignedRupiahInput(String(MAX_RUPIAH + 1))).toBeNull();
    expect(parseSignedRupiahInput("abc")).toBeNull();
  });
});

describe("isValidRupiah", () => {
  it("hanya menerima integer positif dalam batas", () => {
    expect(isValidRupiah(1)).toBe(true);
    expect(isValidRupiah(MAX_RUPIAH)).toBe(true);
    expect(isValidRupiah(0)).toBe(false);
    expect(isValidRupiah(-1)).toBe(false);
    expect(isValidRupiah(1.5)).toBe(false);
    expect(isValidRupiah(MAX_RUPIAH + 1)).toBe(false);
  });
});

describe("signedAmount", () => {
  it("menentukan arah aliran lewat jenis transaksi", () => {
    expect(signedAmount(100_000, "INCOME")).toBe(100_000);
    expect(signedAmount(100_000, "EXPENSE")).toBe(-100_000);
  });
});

describe("percentage", () => {
  it("mengembalikan 0 bila total tidak positif", () => {
    expect(percentage(1, 0)).toBe(0);
    expect(percentage(1, -5)).toBe(0);
  });

  it("membulatkan satu angka desimal", () => {
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(2, 3)).toBe(66.7);
    expect(percentage(3, 3)).toBe(100);
  });
});

describe("safeSum", () => {
  it("menjumlahkan nilai biasa tanpa mengubahnya", () => {
    expect(safeSum([1_000, 2_000, 3_000])).toBe(6_000);
    expect(safeSum([])).toBe(0);
  });

  it("menjumlahkan nilai negatif dengan benar", () => {
    expect(safeSum([-1_000, 2_000])).toBe(1_000);
    expect(safeSum([-1_000, -2_000])).toBe(-3_000);
  });

  // Regression: saldo akun adalah hasil penjumlahan banyak transaksi. Kalau
  // penjumlahannya melewati batas angka yang aman, `Number` mulai kehilangan
  // presisi dan laporan keuangan bisa meleset jauh — bukan cuma pembulatan
  // beberapa rupiah.
  it("tidak pernah keluar dari rentang angka yang aman saat positif meledak", () => {
    const total = safeSum([MAX_SAFE_RUPIAH, MAX_SAFE_RUPIAH, MAX_SAFE_RUPIAH]);
    expect(total).toBe(MAX_SAFE_RUPIAH);
    expect(Number.isSafeInteger(total)).toBe(true);
  });

  it("menjaga sisi negatif tetap aman", () => {
    const total = safeSum([-MAX_SAFE_RUPIAH, -MAX_SAFE_RUPIAH, -MAX_SAFE_RUPIAH]);
    expect(total).toBe(-MAX_SAFE_RUPIAH);
    expect(Number.isSafeInteger(total)).toBe(true);
  });

  it("jumlahkan nominal transaksi besar tetap presisi", () => {
    // Empat transaksi di batas kolom INT 32-bit masih jauh di bawah batas
    // angka aman, jadi hasil akhirnya harus persis, tidak dibulatkan.
    expect(safeSum([MAX_RUPIAH, MAX_RUPIAH, MAX_RUPIAH, MAX_RUPIAH])).toBe(
      MAX_RUPIAH * 4,
    );
  });
});

describe("accountBalanceOf", () => {
  it("menghitung saldo awal + pemasukan − pengeluaran + transfer", () => {
    expect(
      accountBalanceOf({
        initialBalance: 1_000_000,
        income: 500_000,
        expense: 200_000,
        transferIn: 300_000,
        transferOut: 100_000,
      }),
    ).toBe(1_500_000);
  });

  it("menghasilkan saldo negatif tanpa kehilangan presisi", () => {
    expect(
      accountBalanceOf({
        initialBalance: 0,
        income: 0,
        expense: 750_000,
        transferIn: 0,
        transferOut: 0,
      }),
    ).toBe(-750_000);
  });

  it("menjaga saldo tetap di dalam rentang aman walau komponennya ekstrem", () => {
    const balance = accountBalanceOf({
      initialBalance: MAX_RUPIAH,
      income: MAX_RUPIAH,
      expense: 0,
      transferIn: MAX_RUPIAH,
      transferOut: 0,
    });
    expect(Number.isSafeInteger(balance)).toBe(true);
  });
});