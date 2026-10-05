import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAccountBalances } from "@/server/queries/finance";

/**
 * API untuk bot Telegram: baca ringkasan saldo.
 *
 * Auth: header `Authorization: Bearer <BOT_API_KEY>`.
 *
 * Mengembalikan total saldo dan rincian per akun (non-arsip).
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const expected = process.env.BOT_API_KEY;
  const header = request.headers.get("authorization");
  const [, token] = (header ?? "").split(" ");
  if (!expected || token !== expected) {
    return NextResponse.json(
      { ok: false, error: "API key tidak valid." },
      { status: 401 }
    );
  }

  const balances = await getAccountBalances();
  const total = balances.reduce((sum, a) => sum + a.balance, 0);

  return NextResponse.json({
    ok: true,
    total,
    accounts: balances.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance,
    })),
  });
}
