import { describe, expect, it } from "vitest";
import {
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  formatDateLong,
  formatDateShort,
  formatMonthLabel,
  monthToRange,
  normalizeMonthKey,
  parseMonthKey,
  shiftMonth,
  toDateInputValue,
  toUtcMidnight,
} from "@/lib/date";

describe("daftar nama bulan", () => {
  it("lengkap 12 bulan dan sejajar antara versi panjang dan pendek", () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES_SHORT).toHaveLength(12);
    expect(MONTH_NAMES[9]).toBe("Oktober");
    expect(MONTH_NAMES_SHORT[9]).toBe("Okt");
  });
});

describe("parseMonthKey", () => {
  it("mengurai key bulan yang sah", () => {
    expect(parseMonthKey("2026-10")).toEqual({ year: 2026, month: 10 });
  });

  it("menolak format, bulan, dan tahun di luar jangkauan", () => {
    expect(parseMonthKey("2026-13")).toBeNull();
    expect(parseMonthKey("2026-00")).toBeNull();
    expect(parseMonthKey("26-10")).toBeNull();
    expect(parseMonthKey("abcd")).toBeNull();
    expect(parseMonthKey("1899-01")).toBeNull();
    expect(parseMonthKey("")).toBeNull();
    expect(parseMonthKey(null)).toBeNull();
  });
});

describe("monthToRange", () => {
  it("menghasilkan rentang setengah terbuka pada UTC midnight", () => {
    const { start, end } = monthToRange("2026-10");
    expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("melewati tahun dengan benar pada Desember", () => {
    const { end } = monthToRange("2026-12");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("normalizeMonthKey", () => {
  it("mempertahankan key yang sah", () => {
    expect(normalizeMonthKey("2026-10")).toBe("2026-10");
  });

  it("jatuh ke bulan berjalan saat input rusak, bukan melempar error", () => {
    expect(normalizeMonthKey("ngawur")).toMatch(/^\d{4}-\d{2}$/);
    expect(normalizeMonthKey(undefined)).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("shiftMonth", () => {
  it("menggeser maju dan munduracross batas tahun", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
  });
});

describe("formatMonthLabel", () => {
  it("menghasilkan label Bahasa Indonesia", () => {
    expect(formatMonthLabel("2026-10")).toBe("Oktober 2026");
  });

  it("mengembalikan input apa adanya bila tidak valid", () => {
    expect(formatMonthLabel("ngawur")).toBe("ngawur");
  });
});

describe("toUtcMidnight", () => {
  it("menormalkan YYYY-MM-DD menjadi UTC midnight", () => {
    expect(toUtcMidnight("2026-10-01")?.toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });

  it("menolak tanggal kalender yang tidak pernah ada", () => {
    expect(toUtcMidnight("2026-02-31")).toBeNull();
    expect(toUtcMidnight("2026-13-01")).toBeNull();
  });

  it("menolak format yang tidak lengkap", () => {
    expect(toUtcMidnight("2026-2-1")).toBeNull();
    expect(toUtcMidnight("")).toBeNull();
    expect(toUtcMidnight(null)).toBeNull();
  });

  it("bolak-balik dengan toDateInputValue tanpa kehilangan hari", () => {
    const original = "2026-10-01";
    expect(toDateInputValue(toUtcMidnight(original)!)).toBe(original);
  });
});

describe("shiftMonth menjaga hasil tetap dalam rentang tahun yang sah", () => {
  // Regression: `shiftMonth("1900-01", -1)` pernah menghasilkan "1899-12",
  // yang `parseMonthKey()` tolak. `monthToRange()` lalu jatuh diam-diam ke bulan
  // BERJALAN, jadi user menekan "Bulan lalu" terus tapi datanya tidak berubah.
  it("clamp ke batas bawah saat menggeser keluar dari 1900", () => {
    const result = shiftMonth("1900-01", -1);
    expect(result).toBe("1900-01");
    expect(parseMonthKey(result)).not.toBeNull();
  });

  it("clamp ke batas atas saat menggeser keluar dari 2999", () => {
    const result = shiftMonth("2999-12", 1);
    expect(result).toBe("2999-12");
    expect(parseMonthKey(result)).not.toBeNull();
  });

  it("hasil geseran selalu bisa dipakai monthToRange tanpa jatuh diam-diam", () => {
    for (let delta = -2000; delta <= 2000; delta += 1) {
      const shifted = shiftMonth("1900-01", delta);
      expect(parseMonthKey(shifted), `delta ${delta} -> ${shifted}`).not.toBeNull();
    }
  });

  it("menggeser normal tetap akurat di dalam rentang", () => {
    expect(shiftMonth("2026-10", -1)).toBe("2026-09");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("toUtcMidnight menolak tahun di luar rentang", () => {
  // `Date.UTC` memperlakukan tahun 0-99 sebagai 1900-1999, jadi "0099" tanpa
  // penjagaan akan diam-diam menjadi 1999.
  it("menolak tahun dua digit yang akan di-backslide", () => {
    expect(toUtcMidnight("0099-01-01")).toBeNull();
    expect(toUtcMidnight("0001-01-01")).toBeNull();
  });

  it("menolak tahun sebelum 1900 dan setelah 2999", () => {
    expect(toUtcMidnight("1899-12-31")).toBeNull();
    expect(toUtcMidnight("3000-01-01")).toBeNull();
  });

  it("tetap menerima tahun tepat di batas", () => {
    expect(toUtcMidnight("1900-01-01")?.toISOString()).toBe("1900-01-01T00:00:00.000Z");
    expect(toUtcMidnight("2999-12-31")?.toISOString()).toBe("2999-12-31T00:00:00.000Z");
  });
});

describe("formatDateShort / formatDateLong", () => {
  it("membaca tanggal menurut waktu lokal Asia/Jakarta", () => {
    // 00:00 UTC = 07:00 hari yang sama di Jakarta, jadi tidak meleset hari.
    const date = new Date("2026-10-01T00:00:00.000Z");
    expect(formatDateShort(date)).toBe("1 Okt 2026");
    expect(formatDateLong(date)).toBe("1 Oktober 2026");
  });

  it("tidak meleset ke tanggal sebelumnya saat dinormalkan ke UTC", () => {
    // Tanggal UTC 31 Agustus 17:00 = 1 September 00:00 di Jakarta.
    expect(formatDateShort(new Date("2026-08-31T17:00:00.000Z"))).toBe(
      "1 Sep 2026",
    );
  });
});