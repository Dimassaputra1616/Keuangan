import { describe, expect, it } from "vitest";
import { accountFormSchema } from "./account";

/** Isi form akun yang sudah valid; hanya satu field yang diuji per kasus. */
const base = {
  name: "Rekening BCA",
  type: "BANK",
  purpose: "",
  initialBalance: "1.000.000",
};

describe("accountFormSchema — field purpose", () => {
  // Regression: `purpose` punya kolom di database dan dibaca `calcAvailableToSpend()`,
  // tapi sebelumnya tidak pernah ada di skema, jadi tidak bisa diisi dari form sama
  // sekali. Akibatnya akun Dana Darurat / Dana Tujuan mustahil dibuat.
  it("menerima setiap peran akun yang sah", () => {
    for (const purpose of ["LIQUID", "SAVINGS", "GOAL_FUND", "EMERGENCY"]) {
      const result = accountFormSchema.safeParse({ ...base, purpose });
      expect(result.success, `purpose ${purpose}`).toBe(true);
    }
  });

  it("menyimpan peran sebagai string, bukan boolean", () => {
    const result = accountFormSchema.safeParse({ ...base, purpose: "EMERGENCY" });
    expect(result.success).toBe(true);
    expect(result.success && result.data.purpose).toBe("EMERGENCY");
  });

  // Kolomnya nullable supaya akun lama yang belum punya peran tetap terbaca
  // sebagai "belum ditentukan", bukan dipaksa jadi LIQUID oleh form.
  it("mengubah string kosong menjadi null", () => {
    const result = accountFormSchema.safeParse({ ...base, purpose: "" });
    expect(result.success).toBe(true);
    expect(result.success && result.data.purpose).toBeNull();
  });

  it("menolak peran yang tidak dikenal", () => {
    const result = accountFormSchema.safeParse({ ...base, purpose: "NGAWUR" });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.flatten().fieldErrors.purpose).toBeDefined();
  });

  it("tetap memvalidasi field lain seperti biasa", () => {
    const tanpaNama = accountFormSchema.safeParse({ ...base, name: "" });
    expect(tanpaNama.success).toBe(false);

    const tipeSalah = accountFormSchema.safeParse({ ...base, type: "KRYPTO" });
    expect(tipeSalah.success).toBe(false);
  });
});