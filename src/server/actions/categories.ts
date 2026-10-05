"use server";

import { db } from "@/lib/db";
import { categoryFormSchema, categoryIdSchema } from "@/lib/validations";
import { actionError, describePrismaError, type ActionResult } from "@/lib/types";
import { revalidateFinancePages } from "./revalidate";

function readCategoryForm(formData: FormData) {
  return {
    name: formData.get("name"),
    kind: formData.get("kind"),
    color: formData.get("color"),
  };
}

export async function createCategory(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = categoryFormSchema.safeParse(readCategoryForm(formData));

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  try {
    await db.category.create({
      data: {
        name: parsed.data.name,
        kind: parsed.data.kind,
        color: parsed.data.color,
      },
    });

    revalidateFinancePages();
    return { ok: true, message: "Kategori berhasil ditambahkan." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

export async function updateCategory(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = categoryIdSchema.safeParse({ categoryId: formData.get("id") });

  if (!idParsed.success) {
    return actionError("Kategori tidak valid.");
  }

  const parsed = categoryFormSchema.safeParse(readCategoryForm(formData));

  if (!parsed.success) {
    return actionError(
      "Periksa kembali isian formulir.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const id = idParsed.data.categoryId;

  try {
    // Nama unik per jenis (INCOME / EXPENSE). Bila kategori sudah ada dengan
    // nama serupa, tampilkan pesan yang jelas alih-alih error database mentah.
    const duplicate = await db.category.findFirst({
      where: { name: parsed.data.name, kind: parsed.data.kind, NOT: { id } },
      select: { id: true },
    });

    if (duplicate) {
      return actionError(
        "Sudah ada kategori dengan nama tersebut untuk jenis yang sama.",
        { name: ["Nama sudah dipakai pada jenis ini."] },
      );
    }

    await db.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        kind: parsed.data.kind,
        color: parsed.data.color,
      },
    });

    revalidateFinancePages();
    return { ok: true, message: "Kategori berhasil diperbarui." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

export async function toggleArchiveCategory(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = categoryIdSchema.safeParse({ categoryId: formData.get("id") });

  if (!idParsed.success) {
    return actionError("Kategori tidak valid.");
  }

  const id = idParsed.data.categoryId;

  try {
    const category = await db.category.findUnique({
      where: { id },
      select: { isArchived: true },
    });

    if (!category) return actionError("Kategori tidak ditemukan.");

    await db.category.update({
      where: { id },
      data: { isArchived: !category.isArchived },
    });

    revalidateFinancePages();
    return {
      ok: true,
      message: category.isArchived
        ? "Kategori berhasil diaktifkan."
        : "Kategori berhasil diarsipkan.",
    };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}

export async function deleteCategory(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const idParsed = categoryIdSchema.safeParse({ categoryId: formData.get("id") });

  if (!idParsed.success) {
    return actionError("Kategori tidak valid.");
  }

  const id = idParsed.data.categoryId;

  try {
    const usage = await db.transaction.count({ where: { categoryId: id } });

    if (usage > 0) {
      return actionError(
        `Kategori masih dipakai oleh ${usage} transaksi sehingga tidak bisa dihapus. Arsipkan sebagai gantinya.`,
      );
    }

    await db.category.delete({ where: { id } });

    revalidateFinancePages();
    return { ok: true, message: "Kategori berhasil dihapus." };
  } catch (error) {
    return actionError(describePrismaError(error));
  }
}