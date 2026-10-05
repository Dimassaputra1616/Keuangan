"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { toUtcMidnight } from "@/lib/date";
import { transactionFormSchema } from "@/lib/validations";
import { actionError, describePrismaError, type ActionResult } from "@/lib/types";
import type { TransactionKind } from "@/lib/types";
import { revalidateFinancePages } from "./revalidate";

function readTransactionForm(formData: FormData) {
  return {
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    description: formData.get("description"),
    notes: formData.get("notes") ?? "",
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"),
  };
}

/**
 * Pastikan akun dan kategori ada, aktif, dan jenisnya cocok.
 *
 * Kategori income tidak boleh dipakai pada transaksi expense (dan sebaliknya).
 * Ini dicek di sini, di luar zod, karena memerlukan akses database.
 */
async function validateRelations(
  accountId: string,
  categoryId: string,
  kind: TransactionKind,
): Promise<ActionResult | null> {
  const [account, category] = await Promise.all([
    db.account.findUnique({
      where: { id: accountId },
      select: { id: true, name: true, isArchived: true },
    }),
    db.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, kind: true, isArchived: true },
    }),
  ]);

  if (!account) {
    return actionError("Akun tidak ditemukan.", { accountId: ["Akun tidak ditemukan."] });
  }

  if (account.isArchived) {
    return actionError(
      `Akun "${account.name}" sudah diarsipkan sehingga tidak bisa dipakai.`,
      { accountId: ["Akun sudah diarsipkan."] },
    );
  }

  if (!category) {
    return actionError("Kategori tidak ditemukan.", {
      categoryId: ["Kategori tidak ditemukan."],
    });
  }

  if (category.kind !== kind) {
    return actionError(
      `Kategori "${category.name}" bukan kategori ${kind === "INCOME" ? "pemasukan" : "pengeluaran"}.`,
      { categoryId: ["Kategori tidak sesuai jenis transaksi."] },
    );
  }

  return null;
}

export async function createTransaction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = transactionFormSchema.safeParse(readTransactionForm(formData));

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { kind, amount, date, description, notes, accountId, categoryId } = parsed.data;
  const occurredAt = toUtcMidnight(date);

  if (!occurredAt) {
    return actionError("Tanggal tidak valid.", { date: ["Tanggal tidak valid."] });
  }

  const relationError = await validateRelations(accountId, categoryId, kind);
  if (relationError) return relationError;

  try {
    await db.transaction.create({
      data: {
        kind,
        amount,
        occurredAt,
        description,
        notes: notes.length > 0 ? notes : null,
        accountId,
        categoryId,
      },
    });
  } catch (error) {
    return actionError(describePrismaError(error));
  }

  // `redirect` melempar exception NEXT_REDIRECT, jadi harus DI LUAR blok try
  // agar tidak tertangkap dan dianggap kegagalan.
  revalidateFinancePages();
  redirect("/transaksi");
}

export async function updateTransaction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");

  if (id.length === 0) {
    return actionError("Transaksi tidak valid.");
  }

  const parsed = transactionFormSchema.safeParse(readTransactionForm(formData));

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { kind, amount, date, description, notes, accountId, categoryId } = parsed.data;
  const occurredAt = toUtcMidnight(date);

  if (!occurredAt) {
    return actionError("Tanggal tidak valid.", { date: ["Tanggal tidak valid."] });
  }

  const relationError = await validateRelations(accountId, categoryId, kind);
  if (relationError) return relationError;

  try {
    await db.transaction.update({
      where: { id },
      data: {
        kind,
        amount,
        occurredAt,
        description,
        notes: notes.length > 0 ? notes : null,
        accountId,
        categoryId,
      },
    });
  } catch (error) {
    return actionError(describePrismaError(error));
  }

  revalidateFinancePages();
  redirect("/transaksi");
}

export async function deleteTransaction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");

  if (id.length === 0) {
    return actionError("Transaksi tidak valid.");
  }

  try {
    await db.transaction.delete({ where: { id } });

    revalidateFinancePages();
    return { ok: true, message: "Transaksi berhasil dihapus." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}