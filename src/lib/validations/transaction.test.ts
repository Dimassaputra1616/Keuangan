import { describe, expect, it } from "vitest";
import { amountSchema, signedAmountSchema } from "@/lib/validations/shared";
import { transactionFormSchema } from "@/lib/validations/transaction";
import { MAX_RUPIAH } from "@/lib/money";

describe("amountSchema", () => {
  it("membersihkan pemisah ribuan menjadi integer", () => {
    expect(amountSchema.parse("1.250.000")).toBe(1_250_000);
  });

  it("menolak input kosong", () => {
    const result = amountSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("menolak nominal di atas batas INTEGER 32-bit", () => {
    const result = amountSchema.safeParse(String(MAX_RUPIAH + 1));
    expect(result.success).toBe(false);
  });
});

describe("signedAmountSchema", () => {
  it("menerima saldo awal negatif untuk overdraft", () => {
    expect(signedAmountSchema.parse("-500.000")).toBe(-500_000);
  });

  it("menganggap string kosong sebagai nol", () => {
    expect(signedAmountSchema.parse("")).toBe(0);
  });
});

describe("transactionFormSchema", () => {
  const valid = {
    kind: "EXPENSE",
    amount: "25.000",
    date: "2026-10-01",
    description: "Belanja bulanan",
    notes: "",
    accountId: "acc-1",
    categoryId: "cat-1",
  };

  it("menerima isian yang sah dan mengubah nominal jadi number", () => {
    const parsed = transactionFormSchema.parse(valid);
    expect(parsed.amount).toBe(25_000);
    expect(parsed.kind).toBe("EXPENSE");
  });

  it("menolak jenis transaksi yang tidak dikenal", () => {
    const result = transactionFormSchema.safeParse({ ...valid, kind: "NGAWUR" });
    expect(result.success).toBe(false);
  });

  it("menolak tanggal yang tidak pernah ada", () => {
    expect(transactionFormSchema.safeParse({ ...valid, date: "2026-02-31" }).success).toBe(false);
  });

  it("menolak keterangan kosong", () => {
    expect(transactionFormSchema.safeParse({ ...valid, description: "   " }).success).toBe(false);
  });

  it("memotong keterangan yang melebihi batas panjang", () => {
    const result = transactionFormSchema.safeParse({
      ...valid,
      description: "x".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("menolak akun atau kategori yang tidak dipilih", () => {
    expect(transactionFormSchema.safeParse({ ...valid, accountId: "" }).success).toBe(false);
    expect(transactionFormSchema.safeParse({ ...valid, categoryId: "" }).success).toBe(false);
  });
});