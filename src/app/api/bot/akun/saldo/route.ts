import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { MAX_RUPIAH } from "@/lib/money";
import { isAccountType } from "@/lib/types";

/**
 * API untuk bot Telegram: set saldo akun.
 *
 * Dipakai saat pengguna menyatakan saldo terkini lewat chat, misalnya
 * "saldo seabank 1,2jt". Bukan transaksi — hanya mengoreksi titik awal
 * (`initialBalance`) supaya total saldo akun sama dengan yang dinyatakan.
 *
 * Auth: header `Authorization: Bearer <BOT_API_KEY>`.
 *
 * Body (JSON):
 * - accountName: string tidak kosong (wajib). Dicari case-insensitive;
 *   bila belum ada, akun baru dibuat.
 * - balance: integer >= 0 (wajib). Saldo yang dinyatakan pengguna.
 * - type: "TUNAI" | "BANK" | "EWALLET" | "KREDIT" (opsional, default "BANK").
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

export async function POST(request: NextRequest) {
  const expected = process.env.BOT_API_KEY;
  const header = request.headers.get("authorization");
  const [, token] = (header ?? "").split(" ");
  if (!expected || token !== expected) {
    return unauthorized();
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Body harus JSON yang valid.");
  }

  const accountName =
    typeof body.accountName === "string" ? body.accountName.trim() : "";
  const balance = body.balance;
  const type =
    typeof body.type === "string" && isAccountType(body.type)
      ? body.type
      : "BANK";

  if (!accountName) {
    return badRequest("accountName tidak boleh kosong.");
  }
  if (typeof balance !== "number" || !Number.isInteger(balance) || balance < 0) {
    return badRequest("balance harus integer >= 0.");
  }
  if (balance > MAX_RUPIAH) {
    return badRequest(`balance melebihi batas ${MAX_RUPIAH}.`);
  }

  // Cari akun (case-insensitive), buat baru bila belum ada.
  let account = await db.account.findFirst({
    where: {
      name: { equals: accountName, mode: "insensitive" },
      isArchived: false,
    },
  });
  if (!account) {
    account = await db.account.create({
      data: { name: accountName, type, initialBalance: 0 },
    });
  }

  // Hitung sumbangan transaksi yang sudah ada, lalu geser initialBalance
  // supaya total = balance yang dinyatakan.
  // Rumus saldo: initialBalance + income - expense + transferIn - transferOut
  const [txSums, outSum, inSum] = await Promise.all([
    db.transaction.groupBy({
      by: ["kind"],
      where: { accountId: account.id },
      _sum: { amount: true },
    }),
    db.transfer.aggregate({
      where: { fromAccountId: account.id },
      _sum: { amount: true },
    }),
    db.transfer.aggregate({
      where: { toAccountId: account.id },
      _sum: { amount: true },
    }),
  ]);
  let txNet = 0;
  for (const row of txSums) {
    if (row.kind === "INCOME") txNet += row._sum.amount ?? 0;
    else txNet -= row._sum.amount ?? 0;
  }
  txNet += (inSum._sum.amount ?? 0) - (outSum._sum.amount ?? 0);

  const newInitial = balance - txNet;

  const updated = await db.account.update({
    where: { id: account.id },
    data: { initialBalance: newInitial },
    select: { id: true, name: true, type: true, initialBalance: true },
  });

  return NextResponse.json({
    ok: true,
    account: updated,
    balance,
  });
}
