"use server";

import { db } from "@/lib/db";
import { accountFormSchema, accountIdSchema } from "@/lib/validations";
import { actionError, describePrismaError, type ActionResult } from "@/lib/types";
import { revalidateFinancePages } from "./revalidate";

function readAccountForm(formData: FormData) {
  return {
    name: formData.get("name"),
    type: formData.get("type"),
    initialBalance: formData.get("initialBalance") ?? "",
  };
}

export async function createAccount(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = accountFormSchema.safeParse(readAccountForm(formData));

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await db.account.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        initialBalance: parsed.data.initialBalance,
      },
    });

    revalidateFinancePages();
    return { ok: true, message: "Akun berhasil ditambahkan." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

export async function updateAccount(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = accountIdSchema.safeParse({ accountId: formData.get("id") });

  if (!idParsed.success) {
    return actionError("Akun tidak valid.");
  }

  const parsed = accountFormSchema.safeParse(readAccountForm(formData));

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await db.account.update({
      where: { id: idParsed.data.accountId },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        initialBalance: parsed.data.initialBalance,
      },
    });

    revalidateFinancePages();
    return { ok: true, message: "Akun berhasil diperbarui." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

/** Arsipkan akun: disembunyikan dari form tanpa merusak riwayat transaksi. */
export async function toggleArchiveAccount(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = accountIdSchema.safeParse({ accountId: formData.get("id") });

  if (!idParsed.success) {
    return actionError("Akun tidak valid.");
  }

  try {
    const account = await db.account.findUnique({
      where: { id: idParsed.data.accountId },
      select: { isArchived: true },
    });

    if (!account) return actionError("Akun tidak ditemukan.");

    await db.account.update({
      where: { id: idParsed.data.accountId },
      data: { isArchived: !account.isArchived },
    });

    revalidateFinancePages();
    return {
      ok: true,
      message: account.isArchived ? "Akun berhasil diaktifkan." : "Akun berhasil diarsipkan.",
    };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

/**
 * Hapus akun. Diblokir bila masih ada transaksi yang merujuknya, karena
 * foreign key memakai `onDelete: Restrict`.
 */
export async function deleteAccount(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = accountIdSchema.safeParse({ accountId: formData.get("id") });

  if (!idParsed.success) {
    return actionError("Akun tidak valid.");
  }

  const id = idParsed.data.accountId;

  try {
    const usage = await db.transaction.count({ where: { accountId: id } });

    if (usage > 0) {
      return actionError(
        `Akun masih dipakai oleh ${usage} transaksi sehingga tidak bisa dihapus. Arsipkan sebagai gantinya.`,
      );
    }

    await db.account.delete({ where: { id } });

    revalidateFinancePages();
    return { ok: true, message: "Akun berhasil dihapus." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}