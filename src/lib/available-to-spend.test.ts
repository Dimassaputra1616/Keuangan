import { describe, expect, it } from "vitest";
import {
  calcAvailableToSpend,
  describeReserved,
  resolvePurpose,
  type AvailableAccount,
} from "@/lib/available-to-spend";

const account = (
  name: string,
  balance: number,
  purpose: string | null = "LIQUID",
): AvailableAccount => ({ balance, purpose, isArchived: false });

const EMPTY = {
  overdueReceivable: 0,
  reservedGoals: 0,
  reservedSinkingFunds: 0,
  unallocatedBudget: 0,
};

describe("resolvePurpose", () => {
  it("menganggap akun tanpa peran sebagai LIQUID", () => {
    // Akun lama dibuat sebelum fitur ini ada tidak punya `purpose`.
    expect(resolvePurpose(null)).toBe("LIQUID");
    expect(resolvePurpose("NGGAWUR")).toBe("LIQUID");
  });

  it("mempertahankan peran yang sah", () => {
    expect(resolvePurpose("GOAL_FUND")).toBe("GOAL_FUND");
    expect(resolvePurpose("EMERGENCY")).toBe("EMERGENCY");
  });
});

describe("calcAvailableToSpend", () => {
  it("menghitung total kas dari seluruh akun", () => {
    const result = calcAvailableToSpend({
      ...EMPTY,
      accounts: [account("Tunai", 1_000_000), account("Bank", 4_000_000)],
    });

    expect(result.totalCash).toBe(5_000_000);
    expect(result.available).toBe(5_000_000);
  });

  it("TEST 3: saldo yang sudah dikunci tidak boleh diklaim sebagai uang bebas", () => {
    // Contoh dari spec: Dana Nikah 2 juta, Dana Darurat 1 juta.
    const result = calcAvailableToSpend({
      ...EMPTY,
      accounts: [
        account("Dana Nikah", 2_000_000, "GOAL_FUND"),
        account("Dana Darurat", 1_000_000, "EMERGENCY"),
      ],
    });

    // Total kas masih 3 juta, tapi tidak boleh satu rupiah pun dibelanjakan.
    expect(result.totalCash).toBe(3_000_000);
    expect(result.liquidCash).toBe(0);
    expect(result.available).toBe(0);
    expect(result.available).not.toBe(3_000_000);
  });

  it("memisahkan liquid, tabungan, dan dana tujuan", () => {
    const result = calcAvailableToSpend({
      ...EMPTY,
      accounts: [
        account("Dompet", 500_000, "LIQUID"),
        account("Tabungan", 2_000_000, "SAVINGS"),
        account("Dana Nikah", 1_300_000, "GOAL_FUND"),
      ],
    });

    expect(result.totalCash).toBe(3_800_000);
    // Dana tujuan keluar dari hitungan, tabungan masih bisa dipakai.
    expect(result.liquidCash).toBe(2_500_000);
  });

  it("mengurangi setiap tanggungan dan merinci penyebabnya", () => {
    const result = calcAvailableToSpend({
      accounts: [account("Dompet", 10_000_000)],
      reservedGoals: 1_300_000,
      reservedSinkingFunds: 600_000,
      overdueReceivable: 200_000,
      unallocatedBudget: 400_000,
    });

    expect(result.reserved.goal).toBe(1_300_000);
    expect(result.reserved.sinkingFund).toBe(600_000);
    expect(result.reserved.receivable).toBe(200_000);
    expect(result.reserved.budget).toBe(400_000);
    expect(result.reservedTotal).toBe(2_500_000);
    expect(result.available).toBe(7_500_000);
  });

  it("menandai kondisi kurang saat tanggungan melebihi kas likuid", () => {
    const result = calcAvailableToSpend({
      ...EMPTY,
      accounts: [account("Dompet", 1_000_000)],
      reservedGoals: 3_000_000,
    });

    expect(result.available).toBe(-2_000_000);
    expect(result.isShort).toBe(true);
  });

  it("tidak pernah mengembalikan reserved negatif dari input negatif", () => {
    const result = calcAvailableToSpend({
      accounts: [account("Dompet", 1_000_000)],
      overdueReceivable: -500,
      reservedGoals: -100,
      reservedSinkingFunds: 0,
      unallocatedBudget: -250,
    });

    expect(result.reservedTotal).toBe(0);
    expect(result.available).toBe(1_000_000);
    expect(result.isShort).toBe(false);
  });

  it("akun terarsip tetap dihitung, sama seperti total kekayaan", () => {
    const result = calcAvailableToSpend({
      ...EMPTY,
      accounts: [
        { balance: 2_000_000, purpose: "LIQUID", isArchived: true },
        account("Dompet", 1_000_000),
      ],
    });

    expect(result.totalCash).toBe(3_000_000);
  });

  it("menangani saldo negatif (misalnya overdraft)", () => {
    const result = calcAvailableToSpend({
      ...EMPTY,
      accounts: [account("Kartu Kredit", -500_000), account("Dompet", 700_000)],
    });

    expect(result.totalCash).toBe(200_000);
    expect(result.liquidCash).toBe(200_000);
  });
});

describe("describeReserved", () => {
  it("menyebutkan setiap alasan uang ditahan", () => {
    const parts = describeReserved({
      goal: 1_300_000,
      sinkingFund: 600_000,
      receivable: 200_000,
      budget: 0,
    });

    expect(parts).toHaveLength(3);
    expect(parts.join(" ")).toContain("target");
    expect(parts.join(" ")).toContain("dana berkala");
    expect(parts.join(" ")).toContain("piutang");
  });

  it("tidak menghasilkan apa-apa saat tidak ada yang ditahan", () => {
    expect(
      describeReserved({ goal: 0, sinkingFund: 0, receivable: 0, budget: 0 }),
    ).toHaveLength(0);
  });
});
