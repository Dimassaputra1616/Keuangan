import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./auth";

const SECRET = "rahasia-uji-coba";

describe("token sesi", () => {
  it("token yang dibuat bisa diverifikasi dan mengembalikan username", async () => {
    const token = await createSessionToken("bangdim", SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe("bangdim");
  });

  it("token dengan secret berbeda ditolak", async () => {
    const token = await createSessionToken("bangdim", SECRET);
    expect(await verifySessionToken(token, "secret-lain")).toBeNull();
  });

  it("token yang dimodifikasi (payload) ditolak", async () => {
    const token = await createSessionToken("bangdim", SECRET);
    const [payload, sig] = token.split(".");
    const fakePayload = Buffer.from(
      JSON.stringify({ u: "penyusup", exp: Date.now() / 1000 + 99999 })
    ).toString("base64url");
    expect(await verifySessionToken(`${fakePayload}.${sig}`, SECRET)).toBeNull();
    // payload asli tapi signature asal juga ditolak
    expect(await verifySessionToken(`${payload}.asalsaja`, SECRET)).toBeNull();
  });

  it("token tanpa format yang benar ditolak", async () => {
    expect(await verifySessionToken("bukan-token", SECRET)).toBeNull();
    expect(await verifySessionToken("", SECRET)).toBeNull();
    expect(await verifySessionToken(".", SECRET)).toBeNull();
  });

  it("token kedaluwarsa ditolak", async () => {
    // Buat token lalu verifikasi dengan waktu yang dimajukan tidak
    // dimungkinkan tanpa mock, jadi uji payload exp manual.
    const { createHmac } = await import("crypto");
    const payload = Buffer.from(
      JSON.stringify({ u: "bangdim", exp: Math.floor(Date.now() / 1000) - 10 })
    ).toString("base64url");
    const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
    expect(await verifySessionToken(`${payload}.${sig}`, SECRET)).toBeNull();
  });
});
