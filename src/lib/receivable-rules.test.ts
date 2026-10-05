import { describe, expect, it } from "vitest";
import { MAX_RUPIAH } from "@/lib/money";
import {
  checkAmountRange,
  checkDueDate,
  checkPaymentDate,
  checkPaymentWithinLimit,
  checkReceivableAmount,
  countByFilter,
  filterReceivables,
  overdueFlags,
  parseReceivableFilter,
  remainingOf,
} from "@/lib/receivable-rules";

describe("remainingOf", () => {
  it("menghitung sisa dari nominal pokok dikurangi total bayar", () => {
    expect(remainingOf(1_000_000, 400_000)).toBe(600_000);
  });

  it("bernilai nol saat sudah lunas", () => {
    expect(remainingOf(1_000_000, 1_000_000)).toBe(0);
  });

  it("bisa negatif bila pembayaran melebihi pokok — kondisi yang harus dicegah", () => {
    expect(remainingOf(1_000_000, 1_500_000)).toBe(-500_000);
  });
});

describe("checkPaymentWithinLimit", () => {
  it("menolak pembayaran baru ketika piutang sudah lunas", () => {
    const message = checkPaymentWithinLimit(100_000, 0);
    expect(message).toContain("sudah lunas");
  });

  it("menolak pembayaran yang melebihi sisa", () => {
    const message = checkPaymentWithinLimit(700_000, 600_000);
    expect(message).toContain("melebihi sisa");
  });

  it("menerima pembayaran tepat sebesar sisa (melunasi)", () => {
    expect(checkPaymentWithinLimit(600_000, 600_000)).toBeNull();
  });

  it("menerima pembayaran sebagian", () => {
    expect(checkPaymentWithinLimit(100_000, 600_000)).toBeNull();
  });
});

describe("checkReceivableAmount", () => {
  it("menolak nominal pokok di bawah total yang sudah dibayar", () => {
    expect(checkReceivableAmount(500_000, 600_000)).toContain("tidak boleh lebih kecil");
  });

  it("menerima nominal yang sama dengan total bayar (sisa jadi nol)", () => {
    expect(checkReceivableAmount(600_000, 600_000)).toBeNull();
  });

  it("menerima nominal di atas total bayar", () => {
    expect(checkReceivableAmount(900_000, 600_000)).toBeNull();
  });
});

describe("checkPaymentDate", () => {
  it("menerima tanggal bayar yang sama dengan atau setelah tanggal pinjam", () => {
    expect(checkPaymentDate("2026-10-01", "2026-10-01")).toBeNull();
    expect(checkPaymentDate("2026-10-02", "2026-10-01")).toBeNull();
  });

  it("menolak tanggal bayar sebelum tanggal pinjam", () => {
    expect(checkPaymentDate("2026-09-30", "2026-10-01")).toContain(
      "tidak boleh sebelum",
    );
  });
});

describe("checkDueDate", () => {
  it("melewati pemeriksaan bila jatuh tempo tidak diisi", () => {
    expect(checkDueDate(null, "2026-10-01")).toBeNull();
  });

  it("menerima jatuh tempo yang sama dengan atau setelah tanggal pinjam", () => {
    expect(checkDueDate("2026-10-01", "2026-10-01")).toBeNull();
    expect(checkDueDate("2026-11-01", "2026-10-01")).toBeNull();
  });

  it("menolak jatuh tempo sebelum tanggal pinjam", () => {
    expect(checkDueDate("2026-09-30", "2026-10-01")).toContain(
      "tidak boleh sebelum",
    );
  });
});

describe("checkAmountRange", () => {
  it("menolak angka nol, negatif, dan pecahan", () => {
    expect(checkAmountRange(0)).toContain("positif");
    expect(checkAmountRange(-1)).toContain("positif");
    expect(checkAmountRange(1.5)).toContain("positif");
  });

  it("menerima nilai tepat di batas INTEGER 32-bit", () => {
    expect(checkAmountRange(MAX_RUPIAH)).toBeNull();
    expect(checkAmountRange(MAX_RUPIAH + 1)).toContain("maksimal");
  });
});

describe("parseReceivableFilter", () => {
  it("mengdefaults ke 'aktif' untuk nilai tidak dikenal", () => {
    expect(parseReceivableFilter(null)).toBe("aktif");
    expect(parseReceivableFilter("ngawur")).toBe("aktif");
    expect(parseReceivableFilter("lunas")).toBe("lunas");
    expect(parseReceivableFilter("semua")).toBe("semua");
  });
});

describe("filterReceivables", () => {
  const rows = [
    { id: "a", isSettled: false, isCancelled: false },
    { id: "b", isSettled: true, isCancelled: false },
    { id: "c", isSettled: false, isCancelled: true },
  ];

  it("'aktif' hanya menyisakan yang belum lunas dan belum dibatalkan", () => {
    expect(filterReceivables(rows, "aktif").map((row) => row.id)).toEqual(["a"]);
  });

  it("'lunas' hanya yang sisa nol", () => {
    expect(filterReceivables(rows, "lunas").map((row) => row.id)).toEqual(["b"]);
  });

  it("'semua' mengembalikan seluruh baris", () => {
    expect(filterReceivables(rows, "semua")).toHaveLength(3);
  });
});

describe("countByFilter", () => {
  it("menghitung jumlah tiap saringan secara konsisten", () => {
    const rows = [
      { isSettled: false, isCancelled: false },
      { isSettled: false, isCancelled: true },
      { isSettled: true, isCancelled: false },
    ];

    expect(countByFilter(rows)).toEqual({ aktif: 1, lunas: 1, semua: 3 });
  });
});

describe("overdueFlags", () => {
  it("menandai lunas bila sisa nol atau kurang", () => {
    expect(overdueFlags({ dueAtDay: "2026-10-01", today: "2026-10-05", remaining: 0, isCancelled: false }).isSettled).toBe(true);
    expect(overdueFlags({ dueAtDay: "2026-10-01", today: "2026-10-05", remaining: -1, isCancelled: false }).isSettled).toBe(true);
  });

  it("menandai terlambat saat lewat jatuh tempo, belum lunas, dan tidak dibatalkan", () => {
    expect(
      overdueFlags({
        dueAtDay: "2026-10-01",
        today: "2026-10-05",
        remaining: 500_000,
        isCancelled: false,
      }).isOverdue,
    ).toBe(true);
  });

  it("tidak menandai terlambat pada tanggal jatuh tempo itu juga", () => {
    expect(
      overdueFlags({
        dueAtDay: "2026-10-05",
        today: "2026-10-05",
        remaining: 500_000,
        isCancelled: false,
      }).isOverdue,
    ).toBe(false);
  });

  it("tidak menandai terlambat untuk piutang tanpa jatuh tempo atau yang dibatalkan", () => {
    expect(
      overdueFlags({
        dueAtDay: null,
        today: "2026-10-05",
        remaining: 500_000,
        isCancelled: false,
      }).isOverdue,
    ).toBe(false);

    expect(
      overdueFlags({
        dueAtDay: "2026-10-01",
        today: "2026-10-05",
        remaining: 500_000,
        isCancelled: true,
      }).isOverdue,
    ).toBe(false);
  });
});