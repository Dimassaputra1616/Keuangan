import { describe, expect, it } from "vitest";
import { MAX_RUPIAH } from "@/lib/money";
import {
  checkTransferAccounts,
  checkTransferAmount,
  sumTransferImpacts,
  transferImpact,
} from "@/lib/transfer-rules";

describe("checkTransferAccounts", () => {
  it("menolak akun asal dan tujuan yang sama", () => {
    expect(checkTransferAccounts("acc-1", "acc-1")).toContain("harus berbeda");
  });

  it("menerima dua akun berbeda", () => {
    expect(checkTransferAccounts("acc-1", "acc-2")).toBeNull();
  });

  it("menolak akun yang belum dipilih", () => {
    expect(checkTransferAccounts("", "acc-2")).toContain("Akun asal wajib");
    expect(checkTransferAccounts("acc-1", "")).toContain("Akun tujuan wajib");
  });
});

describe("checkTransferAmount", () => {
  it("menolak nilai nol, negatif, dan pecahan", () => {
    expect(checkTransferAmount(0)).toContain("positif");
    expect(checkTransferAmount(-1)).toContain("positif");
    expect(checkTransferAmount(1.5)).toContain("positif");
  });

  it("menerima nilai tepat di batas INTEGER 32-bit", () => {
    expect(checkTransferAmount(MAX_RUPIAH)).toBeNull();
    expect(checkTransferAmount(MAX_RUPIAH + 1)).toContain("maksimal");
  });
});

describe("transferImpact — TEST 2: transfer tidak boleh menggeser cashflow", () => {
  it("tidak mengubah total aset", () => {
    expect(transferImpact(1_300_000).netAssetChange).toBe(0);
  });

  it("tidak menambah pemasukan maupun pengeluaran", () => {
    const impact = transferImpact(1_300_000);
    expect(impact.incomeImpact).toBe(0);
    expect(impact.expenseImpact).toBe(0);
  });

  it("memindahkan saldo: asal turun, tujuan naik", () => {
    const impact = transferImpact(1_300_000);
    expect(impact.fromDelta).toBe(-1_300_000);
    expect(impact.toDelta).toBe(1_300_000);
  });

  it("dijumlahkan dengan benar saat banyak transfer digabung", () => {
    const total = sumTransferImpacts([
      transferImpact(500_000),
      transferImpact(200_000),
    ]);

    expect(total.netAssetChange).toBe(0);
    expect(total.incomeImpact).toBe(0);
    expect(total.expenseImpact).toBe(0);
    expect(total.fromDelta).toBe(-700_000);
    expect(total.toDelta).toBe(700_000);
  });
});
