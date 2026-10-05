import { revalidatePath } from "next/cache";

/**
 * Semua mutasi keuangan memengaruhi dashboard, daftar transaksi, akun,
 * kategori, dan piutang sekaligus, jadi kelima path-nya di-invalidate setiap
 * kali ada perubahan.
 *
 * File ini sengaja TANPA direktif `"use server"` karena berkas `"use server"`
 * hanya boleh mengekspor fungsi async.
 */
export function revalidateFinancePages() {
  revalidatePath("/");
  revalidatePath("/transaksi");
  revalidatePath("/akun");
  revalidatePath("/kategori");
  revalidatePath("/piutang");
}

/** Tambahan path detail satu piutang tertentu. */
export function revalidateReceivable(receivableId: string) {
  revalidateFinancePages();
  revalidatePath(`/piutang/${receivableId}`);
}