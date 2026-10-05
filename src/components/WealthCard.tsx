import { formatRupiah } from "@/lib/money";
import type { WealthSummary } from "@/lib/wealth";
import { IconAlert, IconReceivable, IconWallet } from "@/components/Icons";

/**
 * Kartu utama dashboard: total kekayaan.
 *
 * Angka ini memakai token `primary`, yang otomatis berubah jadi terang saat
 * mode gelap aktif, jadi kontrasnya tetap terjaga di kedua mode tanpa perlu
 * varian `dark:` tambahan.
 *
 * Komponen ini sengaja tanpa state agar tetap bisa dipakai di Server Component.
 */
export function WealthCard({
  wealth,
  overdueCount,
  overdueAmount,
}: {
  wealth: WealthSummary;
  overdueCount: number;
  overdueAmount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-card bg-linear-to-br from-primary via-primary to-sidebar-brand-to p-6 text-primary-foreground shadow-lifted sm:p-7">
      {/* Cahaya lembut di sudut kanan, murni dekoratif. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-glow blur-2xl"
      />
      {/* `primary-foreground`, bukan `white`: kartu ini teksnya berwarna
          `primary-foreground`, jadi garis tipisnya ikut token yang sama supaya
          tetap benar kalau palet primary berubah. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full border border-primary-foreground/15"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest opacity-70">
            Total kekayaan
            <span className="normal-case tracking-normal opacity-60">
              {" "}
              · saat ini
            </span>
          </p>

          <p className="mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl lg:text-5xl">
            {formatRupiah(wealth.total)}
          </p>

          {wealth.isNegative ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm opacity-80">
              <IconAlert className="h-4 w-4 shrink-0" />
              Utang lebih besar dari aset yang tercatat
            </p>
          ) : (
            <p className="mt-2 text-sm opacity-70">
              Cash {wealth.accountCount} akun + piutang yang belum lunas
            </p>
          )}
        </div>

        {/* Tumpuk vertikal di layar sempit. `shrink-0` hanya di layar lebar,
            kalau tidak bisa memaksa keluar dari viewport di HP. */}
        <dl className="flex w-full flex-col gap-4 sm:w-auto sm:shrink-0 sm:flex-row sm:items-end sm:gap-8">
          <Breakdown
            icon={<IconWallet className="h-4 w-4" />}
            label="Cash"
            value={formatRupiah(wealth.cash)}
            hint={
              wealth.archivedCount > 0
                ? `${wealth.accountCount} akun, ${wealth.archivedCount} terarsip`
                : `${wealth.accountCount} akun`
            }
          />

          <div
            className="hidden h-14 w-px bg-current opacity-20 sm:block"
            aria-hidden="true"
          />

          <Breakdown
            icon={<IconReceivable className="h-4 w-4" />}
            label="Piutang"
            value={formatRupiah(wealth.receivable)}
            hint={
              overdueCount > 0
                ? `${overdueCount} terlambat · ${formatRupiah(overdueAmount)}`
                : "Tidak ada yang terlambat"
            }
          />
        </dl>
      </div>
    </section>
  );
}

function Breakdown({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest opacity-70">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 text-lg font-semibold tabular-nums sm:text-xl">
        {value}
      </dd>
      <p className="mt-0.5 text-xs opacity-60">{hint}</p>
    </div>
  );
}
