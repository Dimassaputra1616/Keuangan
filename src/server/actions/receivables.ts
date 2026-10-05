"use server";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDateInputValue, toUtcMidnight } from "@/lib/date";
import {
  paymentFormSchema,
  paymentIdSchema,
  receivableFormSchema,
  receivableIdSchema,
} from "@/lib/validations";
import {
  actionError,
  describePrismaError,
  type ActionResult,
  type TransactionKind,
} from "@/lib/types";
import { formatRupiah } from "@/lib/money";
import {
  checkPaymentDate,
  checkPaymentWithinLimit,
  checkReceivableAmount,
  remainingOf,
} from "@/lib/receivable-rules";
import { revalidateReceivable } from "./revalidate";

/**
 * Setiap piutang dan pembayaran selalu berpasangan dengan satu
 * `Transaction`:
 *
 *   - Piutang dibuat  -> Transaction EXPENSE (uang keluar dari rekening)
 *   - Pembayaran     -> Transaction INCOME  (uang masuk ke rekening)
 *
 * Dengan begitu arus kas tetap akurat dan sisa piutang bisa dihitung dari
 * satu sumber data yang sama, tanpa risiko angka dobel.
 */

function readReceivableForm(formData: FormData) {
  return {
    personName: formData.get("personName"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    lentAt: formData.get("lentAt"),
    dueAt: formData.get("dueAt") ?? "",
    notes: formData.get("notes") ?? "",
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"),
  };
}

/**
 * Pastikan akun dan kategori ada, aktif, dan jenisnya cocok.
 * Kategori pemasukan tidak boleh dipakai untuk transaksi pengeluaran.
 */
async function validateRelations(
  accountId: string,
  categoryId: string,
  kind: TransactionKind,
  client: Pick<Prisma.TransactionClient, "account" | "category"> = db,
): Promise<ActionResult | null> {
  const [account, category] = await Promise.all([
    client.account.findUnique({
      where: { id: accountId },
      select: { id: true, name: true, isArchived: true },
    }),
    client.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, kind: true, isArchived: true },
    }),
  ]);

  if (!account) {
    return actionError("Akun tidak ditemukan.", {
      accountId: ["Akun tidak ditemukan."],
    });
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
      `Kategori "${category.name}" bukan kategori ${
        kind === "INCOME" ? "pemasukan" : "pengeluaran"
      }.`,
      { categoryId: ["Kategori tidak sesuai jenis transaksi."] },
    );
  }

  return null;
}

/**
 * Total yang sudah dibayar untuk satu piutang.
 *
 * `client` bisa diisi dengan transaksi yang sedang berjalan. Wajib begitu kalau
 * hasilnya dipakai untuk validasi yang menentukan boleh/tidaknya sebuah
 * penulisan: bila dibaca lewat `db` di luar transaksi, nilainya bisa basi karena
 * ada pembayaran lain yang masuk di sela waktu (pola check-then-act).
 */
async function getPaidTotal(
  receivableId: string,
  client: Pick<Prisma.TransactionClient, "receivablePayment"> = db,
): Promise<number> {
  const aggregate = await client.receivablePayment.aggregate({
    where: { receivableId },
    _sum: { amount: true },
  });

  return aggregate._sum.amount ?? 0;
}

export async function createReceivable(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = receivableFormSchema.safeParse(readReceivableForm(formData));

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { personName, title, amount, lentAt, dueAt, notes, accountId, categoryId } =
    parsed.data;

  const lentAtDate = toUtcMidnight(lentAt);
  if (!lentAtDate) {
    return actionError("Tanggal pinjam tidak valid.", {
      lentAt: ["Tanggal pinjam tidak valid."],
    });
  }

  const dueAtDate = dueAt ? toUtcMidnight(dueAt) : null;
  if (dueAt && !dueAtDate) {
    return actionError("Jatuh tempo tidak valid.", {
      dueAt: ["Jatuh tempo tidak valid."],
    });
  }

  try {
    const outcome = await db.$transaction(async (tx) => {
      // Validasi akun & kategori DI DALAM transaksi yang sama dengan penulisan,
      // sesuai aturan check-then-act di `AGENTS.md` §3.1.
      const relationError = await validateRelations(accountId, categoryId, "EXPENSE", tx);
      if (relationError) return { status: "error", error: relationError } as const;

      const transaction = await tx.transaction.create({
        data: {
          kind: "EXPENSE",
          amount,
          occurredAt: lentAtDate,
          description: `Dipinjamkan ke ${personName}`,
          notes: [title, notes].filter(Boolean).join(" · ") || null,
          accountId,
          categoryId,
        },
      });

      await tx.receivable.create({
        data: {
          personName,
          title,
          amount,
          lentAt: lentAtDate,
          dueAt: dueAtDate,
          notes: notes.length > 0 ? notes : null,
          lentTransactionId: transaction.id,
        },
      });

      return { status: "ok" } as const;
    });

    if (outcome.status === "error") return outcome.error;

    revalidateReceivable("");
    return { ok: true, message: "Piutang berhasil dicatat." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

export async function updateReceivable(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = receivableIdSchema.safeParse({
    receivableId: formData.get("id"),
  });

  if (!idParsed.success) return actionError("Piutang tidak valid.");

  const receivableId = idParsed.data.receivableId;
  const parsed = receivableFormSchema.safeParse(readReceivableForm(formData));

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { personName, title, amount, lentAt, dueAt, notes, accountId, categoryId } =
    parsed.data;

  const lentAtDate = toUtcMidnight(lentAt);
  if (!lentAtDate) {
    return actionError("Tanggal pinjam tidak valid.", {
      lentAt: ["Tanggal pinjam tidak valid."],
    });
  }

  const dueAtDate = dueAt ? toUtcMidnight(dueAt) : null;
  if (dueAt && !dueAtDate) {
    return actionError("Jatuh tempo tidak valid.", {
      dueAt: ["Jatuh tempo tidak valid."],
    });
  }

  try {
    // Pembacaan piutang dan cek "nominal >= total bayar" sengaja dilakukan DI
    // DALAM transaksi yang sama dengan penulisan. Kalau dibaca di luar, nilainya
    // bisa basi karena ada pembayaran yang masuk bersamaan.
    const outcome = await db.$transaction(async (tx) => {
      const relationError = await validateRelations(accountId, categoryId, "EXPENSE", tx);
      if (relationError) return { status: "error", error: relationError } as const;

      const receivable = await tx.receivable.findUnique({
        where: { id: receivableId },
        select: { id: true, lentTransactionId: true },
      });

      if (!receivable) {
        return {
          status: "error",
          error: actionError("Piutang tidak ditemukan."),
        } as const;
      }

      // Nominal pokok tidak boleh turun di bawah total yang sudah dibayar,
      // karena itu membuat sisa piutang bernilai negatif.
      const paidTotal = await getPaidTotal(receivableId, tx);
      const amountError = checkReceivableAmount(amount, paidTotal);

      if (amountError) {
        return {
          status: "error",
          error: actionError(amountError, {
            amount: [
              `Minimal ${formatRupiah(paidTotal)} karena sudah ada pembayaran sebesar itu.`,
            ],
          }),
        } as const;
      }

      await tx.receivable.update({
        where: { id: receivableId },
        data: {
          personName,
          title,
          amount,
          lentAt: lentAtDate,
          dueAt: dueAtDate,
          notes: notes.length > 0 ? notes : null,
        },
      });

      // Selaraskan transaksi kas agar tidak melenceng dari catatan piutang.
      if (receivable.lentTransactionId) {
        await tx.transaction.update({
          where: { id: receivable.lentTransactionId },
          data: {
            amount,
            occurredAt: lentAtDate,
            description: `Dipinjamkan ke ${personName}`,
            notes: [title, notes].filter(Boolean).join(" · ") || null,
            accountId,
            categoryId,
          },
        });
      }

      return { status: "ok" } as const;
    });

    if (outcome.status === "error") return outcome.error;

    revalidateReceivable(receivableId);
    return { ok: true, message: "Piutang berhasil diperbarui." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

export async function toggleCancelReceivable(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = receivableIdSchema.safeParse({
    receivableId: formData.get("id"),
  });

  if (!idParsed.success) return actionError("Piutang tidak valid.");

  const receivableId = idParsed.data.receivableId;

  try {
    // Baca lalu tulis dalam satu transaksi: tanpa itu, dua klik hampir
    // bersamaan bisa membaca `isCancelled` yang sama dan sama-sama menulis
    // nilai yang sama, sehingga status akhir bukan yang dimaksud pengguna
    // (aturan check-then-act di `AGENTS.md` §3.1).
    const outcome = await db.$transaction(async (tx) => {
      const receivable = await tx.receivable.findUnique({
        where: { id: receivableId },
        select: { isCancelled: true },
      });

      if (!receivable) {
        return {
          status: "error",
          error: actionError("Piutang tidak ditemukan."),
        } as const;
      }

      await tx.receivable.update({
        where: { id: receivableId },
        data: { isCancelled: !receivable.isCancelled },
      });

      return { status: "ok", wasCancelled: receivable.isCancelled } as const;
    });

    if (outcome.status === "error") return outcome.error;

    revalidateReceivable(receivableId);
    return {
      ok: true,
      message: outcome.wasCancelled
        ? "Piutang diaktifkan kembali."
        : "Piutang dibatalkan. Transaksi kas tetap dipertahankan.",
    };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

/**
 * Hapus piutang beserta transaksi kasnya. Diblokir bila sudah ada pembayaran,
 * karena menghapus riwayat pembayaran akan merusak rekonsiliasi.
 */
export async function deleteReceivable(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = receivableIdSchema.safeParse({
    receivableId: formData.get("id"),
  });

  if (!idParsed.success) return actionError("Piutang tidak valid.");

  const receivableId = idParsed.data.receivableId;

  try {
    // Pengecekan jumlah pembayaran dan penghapusan terjadi di transaksi yang
    // SAMA. Kalau dibaca di luar, pembayaran bisa masuk di sela waktu sehingga
    // piutang ikut terhapus padahal pembayarannya masih ada (aturan
    // check-then-act di `AGENTS.md` §3.1).
    const outcome = await db.$transaction(async (tx) => {
      const receivable = await tx.receivable.findUnique({
        where: { id: receivableId },
        select: {
          id: true,
          lentTransactionId: true,
          _count: { select: { payments: true } },
        },
      });

      if (!receivable) {
        return {
          status: "error",
          error: actionError("Piutang tidak ditemukan."),
        } as const;
      }

      if (receivable._count.payments > 0) {
        return {
          status: "error",
          error: actionError(
            `Piutang ini sudah punya ${receivable._count.payments} pembayaran sehingga tidak bisa dihapus. Batalkan saja bila tidak akan ditagih lagi.`,
          ),
        } as const;
      }

      if (receivable.lentTransactionId) {
        await tx.transaction.delete({ where: { id: receivable.lentTransactionId } });
      }
      await tx.receivable.delete({ where: { id: receivableId } });

      return { status: "ok" } as const;
    });

    if (outcome.status === "error") return outcome.error;

    revalidateReceivable(receivableId);
    return { ok: true, message: "Piutang beserta transaksinya dihapus." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

export async function addPayment(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = receivableIdSchema.safeParse({
    receivableId: formData.get("receivableId"),
  });

  if (!idParsed.success) return actionError("Piutang tidak valid.");

  const receivableId = idParsed.data.receivableId;

  const parsed = paymentFormSchema.safeParse({
    amount: formData.get("amount"),
    receivedAt: formData.get("receivedAt"),
    notes: formData.get("notes") ?? "",
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { amount, receivedAt, notes, accountId, categoryId } = parsed.data;

  const receivedAtDate = toUtcMidnight(receivedAt);
  if (!receivedAtDate) {
    return actionError("Tanggal bayar tidak valid.", {
      receivedAt: ["Tanggal bayar tidak valid."],
    });
  }

  try {
    // Sama seperti `updateReceivable`: validasi "tidak melebihi sisa" WAJIB
    // dihitung di dalam transaksi yang sama dengan penulisan. Sebelumnya total
    // bayar dibaca sebelum transaksi dibuka, jadi dua tab yang mengirim form
    // hampir bersamaan bisa membuat total pembayaran melebihi nominal pokok.
    const outcome = await db.$transaction(async (tx) => {
      const relationError = await validateRelations(accountId, categoryId, "INCOME", tx);
      if (relationError) return { status: "error", error: relationError } as const;

      const receivable = await tx.receivable.findUnique({
        where: { id: receivableId },
        select: {
          id: true,
          personName: true,
          amount: true,
          lentAt: true,
          isCancelled: true,
        },
      });

      if (!receivable) {
        return {
          status: "error",
          error: actionError("Piutang tidak ditemukan."),
        } as const;
      }

      if (receivable.isCancelled) {
        return {
          status: "error",
          error: actionError(
            "Piutang ini sudah dibatalkan sehingga pembayaran baru tidak bisa dicatat.",
          ),
        } as const;
      }

      const paidTotal = await getPaidTotal(receivableId, tx);
      const remaining = remainingOf(receivable.amount, paidTotal);

      const limitError = checkPaymentWithinLimit(amount, remaining);
      if (limitError) {
        return {
          status: "error",
          error: actionError(limitError, {
            amount: [
              `Maksimal ${formatRupiah(remaining)}. Masukkan ${formatRupiah(remaining)} untuk melunasi.`,
            ],
          }),
        } as const;
      }

      const dateError = checkPaymentDate(
        receivedAt,
        toDateInputValue(receivable.lentAt),
      );
      if (dateError) {
        return {
          status: "error",
          error: actionError(dateError, { receivedAt: [dateError] }),
        } as const;
      }

      const transaction = await tx.transaction.create({
        data: {
          kind: "INCOME",
          amount,
          occurredAt: receivedAtDate,
          description: `Diterima dari ${receivable.personName}`,
          notes: notes.length > 0 ? notes : null,
          accountId,
          categoryId,
        },
      });

      await tx.receivablePayment.create({
        data: {
          receivableId,
          amount,
          receivedAt: receivedAtDate,
          notes: notes.length > 0 ? notes : null,
          transactionId: transaction.id,
        },
      });

      // Dikembalikan supaya pesan sukses di bawah memakai sisa yang dihitung di
      // dalam transaksi, bukan angka basi dari pembacaan sebelumnya.
      return { status: "ok", remaining } as const;
    });

    if (outcome.status === "error") return outcome.error;

    revalidateReceivable(receivableId);
    return {
      ok: true,
      message:
        outcome.remaining - amount === 0
          ? "Pembayaran tercatat. Piutang ini sudah lunas."
          : `Pembayaran tercatat. Sisa ${formatRupiah(outcome.remaining - amount)}.`,
    };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

/** Hapus satu pembayaran beserta transaksi pemasukan yang terhubung. */
export async function deletePayment(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = paymentIdSchema.safeParse({
    receivableId: formData.get("receivableId"),
    paymentId: formData.get("paymentId"),
  });

  if (!parsed.success) return actionError("Pembayaran tidak valid.");

  const { receivableId, paymentId } = parsed.data;

  try {
    // Pembacaan `transactionId` dan penghapusan harus satu transaksi supaya
    // tidak pernah menghapus pembayaran yang barunya sudah berubah di antara
    // kedua langkah (aturan check-then-act di `AGENTS.md` §3.1).
    const outcome = await db.$transaction(async (tx) => {
      const payment = await tx.receivablePayment.findUnique({
        where: { id: paymentId },
        select: { id: true, transactionId: true },
      });

      if (!payment) {
        return {
          status: "error",
          error: actionError("Pembayaran tidak ditemukan."),
        } as const;
      }

      if (payment.transactionId) {
        await tx.transaction.delete({ where: { id: payment.transactionId } });
      }
      await tx.receivablePayment.delete({ where: { id: paymentId } });

      return { status: "ok" } as const;
    });

    if (outcome.status === "error") return outcome.error;

    revalidateReceivable(receivableId);
    return { ok: true, message: "Pembayaran dihapus beserta transaksinya." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}