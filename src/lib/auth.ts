/**
 * Token sesi bertanda tangan (HMAC-SHA256).
 *
 * Dipakai untuk mengingat status login tanpa server-side storage — cocok
 * untuk deployment serverless (Vercel) di mana memori antar request tidak
 * dijamin sama. Token tidak bisa dipalsukan tanpa mengetahui secret.
 *
 * Format: `base64url(payload).base64url(signature)`.
 * Payload: `{ u: username, exp: unix_timestamp }`.
 *
 * Memakai Web Crypto API supaya bisa jalan di middleware (Edge) maupun di
 * Server Action (Node).
 */

export const SESSION_COOKIE_NAME = "keuangan_session";

/** 30 hari, dalam detik. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type SessionPayload = {
  u: string;
  exp: number;
};

function base64UrlEncode(bytes: Uint8Array): string {
  // Buffer tersedia di Node dan di Edge runtime Next.js.
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlDecodeToString(s: string): string {
  return Buffer.from(s, "base64url").toString("utf-8");
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return base64UrlEncode(new Uint8Array(sig));
}

/**
 * Perbandingan string dalam waktu konstan untuk mencegah timing attack.
 * Dipakai saat memverifikasi tanda tangan token.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Buat token sesi baru untuk username. */
export async function createSessionToken(
  username: string,
  secret: string
): Promise<string> {
  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const sig = await hmacSign(encoded, secret);
  return `${encoded}.${sig}`;
}

/**
 * Verifikasi token sesi. Mengembalikan username bila valid dan belum
 * kedaluwarsa, `null` bila tidak.
 */
export async function verifySessionToken(
  token: string,
  secret: string
): Promise<string | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmacSign(encoded, secret);
  if (!constantTimeEqual(sig, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecodeToString(encoded)) as SessionPayload;
  } catch {
    return null;
  }
  if (
    typeof payload.u !== "string" ||
    typeof payload.exp !== "number" ||
    payload.exp < Math.floor(Date.now() / 1000)
  ) {
    return null;
  }
  return payload.u;
}
