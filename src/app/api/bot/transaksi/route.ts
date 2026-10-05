import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { toUtcMidnight } from "@/lib/date";
import { MAX_RUPIAH } from "@/lib/money";
import { isTransactionKind } from "@/lib/types";

/**
 * API untuk bot Telegram.
 *
 * Bot mengirim transaksi lewat endpoint ini supaya website menjadi satu-satunya
 * sumber data ("wadah"), sedangkan input dilakukan dari Telegram.
 *
 * Auth: header `Authorization: Bearer <BOT_API_KEY>`.
 *
 * Body (JSON):
 * - kind: "INCOME" | "EXPENSE" (wajib)
 * - amount: integer positif rupiah (wajib)
 * - description: string tidak kosong (wajib)
 * - occurredAt: "YYYY-MM-DD" (opsional, default hari ini WIB)
 * - notes: string (opsional)
 * - accountName: string (opsional, default akun aktif pertama)
 * - categoryName: string (opsional, default "Lain-lain" sesuai kind)
 */

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "API key tidak valid." },
    { status: 401 }
  );
}

function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

function checkApiKey(request: NextRequest): boolean {
  const expected = process.env.BOT_API_KEY;
  if (!expected) return false;
  const header = request.headers.get("authorization");
  if (!header) return false;
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token === expected;
}

export async function POST(request: NextRequest) {
  if (!checkApiKey(request)) {
    return unauthorized();
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Body harus JSON yang valid.");
  }

  const kind = body.kind;
  const amount = body.amount;
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const occurredAtInput = typeof body.occurredAt === "string" ? body.occurredAt : undefined;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const accountName = typeof body.accountName === "string" ? body.accountName.trim() : "";
  const categoryName = typeof body.categoryName === "string" ? body.categoryName.trim() : "";

  if (!isTransactionKind(kind)) {
    return badRequest('kind harus "INCOME" atau "EXPENSE".');
  }
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return badRequest("amount harus integer positif.");
  }
  if (amount > MAX_RUPIAH) {
    return badRequest(`amount melebihi batas ${MAX_RUPIAH}.`);
  }
  if (!description) {
    return badRequest("description tidak boleh kosong.");
  }

  // Tanggal: default hari ini (WIB), dinormalisasi ke UTC midnight.
  let dateStr = occurredAtInput;
  if (!dateStr) {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // WIB = UTC+7
    dateStr = now.toISOString().slice(0, 10);
  }
  const occurredAt = toUtcMidnight(dateStr);
  if (!occurredAt) {
    return badRequest("occurredAt tidak valid (format YYYY-MM-DD).");
  }

  // Akun: cari by nama, atau pakai akun aktif pertama.
  const account = accountName
    ? await db.account.findFirst({
        where: { name: accountName, isArchived: false },
      })
    : await db.account.findFirst({
        where: { isArchived: false },
        orderBy: { createdAt: "asc" },
      });
  if (!account) {
    return badRequest(
      accountName
        ? `Akun "${accountName}" tidak ditemukan.`
        : "Tidak ada akun aktif."
    );
  }

  // Kategori: cari by nama+kind, atau pakai "Lain-lain".
  const category = categoryName
    ? await db.category.findFirst({
        where: { name: categoryName, kind, isArchived: false },
      })
    : await db.category.findFirst({
        where: { name: "Lain-lain", kind, isArchived: false },
      });
  if (!category) {
    return badRequest(
      categoryName
        ? `Kategori "${categoryName}" tidak ditemukan untuk ${kind}.`
        : `Kategori default "Lain-lain" tidak ditemukan untuk ${kind}.`
    );
  }

  const created = await db.transaction.create({
    data: {
      kind,
      amount,
      occurredAt,
      description,
      notes: notes || null,
      accountId: account.id,
      categoryId: category.id,
    },
    select: {
      id: true,
      kind: true,
      amount: true,
      description: true,
      occurredAt: true,
      account: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  return NextResponse.json({ ok: true, transaction: created }, { status: 201 });
}
