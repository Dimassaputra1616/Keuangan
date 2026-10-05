"use server";

import { db } from "@/lib/db";
import { accountFormSchema, accountIdSchema } from "@/lib/validations";
import { actionError, describePrismaError, type ActionResult } from "@/lib/types";
import { revalidateFinancePages } from "./revalidate";

function readAccountForm(formData: FormData) {
  return {
    name: formData.get("name"),
    type: formData.get("type"),
    purpose: formData.get("purpose") ?? "",
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
        purpose: parsed.data.purpose,
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
        purpose: parsed.data.purpose,
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
    // Pembacaan dan penulisan dalam satu transaksi: kalau tidak, dua klik
    // hampir bersamaan bisa sama-sama membaca `isArchived` yang sama lalu
    // sama-sama menulis nilai yang sama, sehingga status akhir bukan yang
    // pengguna maksud (lihat aturan check-then-act di `AGENTS.md` §3.1).
    const outcome = await db.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { id: idParsed.data.accountId },
        select: { isArchived: true },
      });

      if (!account) {
        return {
          status: "error",
          error: actionError("Akun tidak ditemukan."),
        } as const;
      }

      await tx.account.update({
        where: { id: idParsed.data.accountId },
        data: { isArchived: !account.isArchived },
      });

      // Nilai lama dikembalikan supaya pesan di bawah memakai keadaan yang
      // benar-benar dibaca di dalam transaksi.
      return { status: "ok", wasArchived: account.isArchived } as const;
    });

    if (outcome.status === "error") return outcome.error;

    revalidateFinancePages();
    return {
      ok: true,
      message: outcome.wasArchived
        ? "Akun berhasil diaktifkan."
        : "Akun berhasil diarsipkan.",
    };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

/**
 * Hapus akun. Diblokir bila masih ada transaksi atau transfer yang merujuknya,
 * karena kedua relasi memakai `onDelete: Restrict`.
 *
 * Perhitungannya harus memuat transfer juga: kalau hanya transaksi yang
 * dihitung, akun yang hanya pernah dipakai transfer akan lolos pemeriksaan lalu
 * ditolak database, dan pesan error foreign key apa adanya membingungkan.
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
    const outcome = await db.$transaction(async (tx) => {
      const [usage, transferUsage] = await Promise.all([
        tx.transaction.count({ where: { accountId: id } }),
        tx.transfer.count({
          where: { OR: [{ fromAccountId: id }, { toAccountId: id }] },
        }),
      ]);

      const total = usage + transferUsage;

      if (total > 0) {
        return {
          status: "error",
          error: actionError(
            `Akun masih dipakai oleh ${total} catatan sehingga tidak bisa dihapus. Arsipkan sebagai gantinya.`,
          ),
        } as const;
      }

      await tx.account.delete({ where: { id } });

      return { status: "ok" } as const;
    });

    if (outcome.status === "error") return outcome.error;

    revalidateFinancePages();
    return { ok: true, message: "Akun berhasil dihapus." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}