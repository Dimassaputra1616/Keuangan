"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toUtcMidnight } from "@/lib/date";
import { transferFormSchema, transferIdSchema } from "@/lib/validations";
import { checkTransferAccounts } from "@/lib/transfer-rules";
import { actionError, describePrismaError, type ActionResult } from "@/lib/types";
import { revalidateFinancePages } from "./revalidate";

/**
 * Mutasi transfer antar akun.
 *
 * Transfer dicatat di tabel `Transfer`, bukan sebagai dua baris `Transaction`.
 * Itu keputusan yang menjaga laporan cashflow tetap jujur: kalau transfer
 * entered sebagai income + expense, saving rate dan arus kas akan melenceng
 * padahal uangnya tidak bertambah dan tidak berkurang.
 */

function readTransferForm(formData: FormData) {
  return {
    amount: formData.get("amount"),
    date: formData.get("date"),
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    notes: formData.get("notes") ?? "",
  };
}

/**
 * Pastikan kedua akun ada dan belum diarsipkan.
 *
 * Membaca lewat `client` transaksi, bukan `db` global, supaya bisa dipanggil
 * dari dalam callback `$transaction`. Validasi ini menentukan boleh/tidaknya
 * penulisan, jadi sesuai `AGENTS.md` §3.1 pembacaannya WAJIB terjadi di
 * transaksi yang sama dengan penyimpanan.
 */
async function validateAccounts(
  fromAccountId: string,
  toAccountId: string,
  client: Pick<Prisma.TransactionClient, "account"> = db,
): Promise<ActionResult | null> {
  const accounts = await client.account.findMany({
    where: { id: { in: [fromAccountId, toAccountId] } },
    select: { id: true, name: true, isArchived: true },
  });

  const byId = new Map(accounts.map((account) => [account.id, account]));

  const from = byId.get(fromAccountId);
  if (!from) {
    return actionError("Akun asal tidak ditemukan.", {
      fromAccountId: ["Akun asal tidak ditemukan."],
    });
  }

  const to = byId.get(toAccountId);
  if (!to) {
    return actionError("Akun tujuan tidak ditemukan.", {
      toAccountId: ["Akun tujuan tidak ditemukan."],
    });
  }

  for (const [field, account] of [
    ["fromAccountId", from],
    ["toAccountId", to],
  ] as const) {
    if (account.isArchived) {
      return actionError(
        `Akun "${account.name}" sudah diarsipkan sehingga tidak bisa dipakai.`,
        { [field]: ["Akun sudah diarsipkan."] },
      );
    }
  }

  return null;
}

export async function createTransfer(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = transferFormSchema.safeParse(readTransferForm(formData));

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { amount, date, fromAccountId, toAccountId, notes } = parsed.data;

  const accountError = checkTransferAccounts(fromAccountId, toAccountId);
  if (accountError) {
    return actionError(accountError, {
      toAccountId: [accountError],
    });
  }

  const occurredAt = toUtcMidnight(date);
  if (!occurredAt) {
    return actionError("Tanggal tidak valid.", { date: ["Tanggal tidak valid."] });
  }

  try {
    // Validasi akun DI DALAM transaksi yang sama dengan penulisan, sesuai
    // aturan check-then-act di `AGENTS.md` §3.1.
    const outcome = await db.$transaction(async (tx) => {
      const relationError = await validateAccounts(fromAccountId, toAccountId, tx);
      if (relationError) return { status: "error", error: relationError } as const;

      await tx.transfer.create({
        data: {
          amount,
          occurredAt,
          notes: notes.length > 0 ? notes : null,
          fromAccountId,
          toAccountId,
        },
      });

      return { status: "ok" } as const;
    });

    if (outcome.status === "error") return outcome.error;
  } catch (error) {
    return actionError(describePrismaError(error));
  }

  // `redirect` melempar exception NEXT_REDIRECT, jadi harus DI LUAR blok try
  // agar tidak tertangkap dan dianggap kegagalan.
  revalidateFinancePages();
  redirect("/transaksi");
}

export async function deleteTransfer(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = transferIdSchema.safeParse({
    transferId: formData.get("transferId"),
  });

  if (!parsed.success) {
    return actionError("Transfer tidak valid.");
  }

  const { transferId } = parsed.data;

  try {
    const deleted = await db.transfer.deleteMany({ where: { id: transferId } });

    if (deleted.count === 0) {
      return actionError("Transfer tidak ditemukan.");
    }
  } catch (error) {
    return actionError(describePrismaError(error));
  }

  revalidateFinancePages();
  return { ok: true, message: "Transfer berhasil dihapus." };
}
