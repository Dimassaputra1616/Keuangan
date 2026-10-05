import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconSearch } from "@/components/Icons";

/**
 * Halaman 404.
 *
 * Tanpa berkas ini, URL yang tidak dikenal atau `id` yang sudah dihapus akan
 * jatuh ke halaman 404 bawaan Next.js — putih polos tanpa sidebar, sama sekali
 * tidak konsisten dengan aplikasi ini. Berkas ini dipakai otomatis oleh Next
 * baik untuk URL yang tidak cocok route maupun untuk `notFound()` yang
 * dipanggil di dalam Server Component.
 */
export default function NotFound() {
  return (
    <div className="animate-fade-up">
      <Card className="mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-sidebar/70 to-accent-soft text-muted-foreground">
          <IconSearch className="h-6 w-6" />
        </span>

        <p className="text-xs font-medium uppercase tracking-widest text-subtle-foreground">
          Error 404
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Alamat yang kamu buka tidak ada, atau datanya sudah dihapus. Periksa
          kembali tautannya.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className={buttonStyles("primary", "md")}>
            Ke dashboard
          </Link>
          <Link href="/transaksi" className={buttonStyles("secondary", "md")}>
            Lihat transaksi
          </Link>
        </div>
      </Card>
    </div>
  );
}