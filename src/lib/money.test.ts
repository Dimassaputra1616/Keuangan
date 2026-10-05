import { describe, expect, it } from "vitest";
import {
  MAX_RUPIAH,
  formatInputAmount,
  formatNumber,
  formatRupiah,
  isValidRupiah,
  parseRupiahInput,
  parseSignedRupiahInput,
  percentage,
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