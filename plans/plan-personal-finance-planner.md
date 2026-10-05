# Rencana: Keuangan Pribadi → Personal Finance Planner

Dokumen ini adalah hasil audit terhadap codebase existing dan rencana
implementasinya. Sesuai instruksi di `README.md` bagian 29 dan "INSTRUKSI
TERAKHIR", **implementasi belum dimulai** — dokumen ini dulu yang disepakati.

Aturan main yang berlaku sepanjang pengerjaan: lihat `AGENTS.md`.

---

## 1. Kondisi project saat ini

| Aspek | Kondisi |
| --- | --- |
| Stack | Next.js 15.5 (App Router), TypeScript, Prisma 6, SQLite, Tailwind v4, zod 3, Vitest |
| Migrasi | 2 (init + receivable) |
| Model | 5: `Account`, `Category`, `Transaction`, `Receivable`, `ReceivablePayment` |
| Tes | 68 tes, 4 berkas, semua hijau |
| Batas server | `127.0.0.1` saja |
| Data | kosong (sudah di-reset, hanya sisa seed) |

Sudah ada dan **sangat baik**: pemisahan logika murni (`src/lib/`) dari query
(`src/server/queries/`) dan mutasi (`src/server/actions/`), validasi zod berlapis,
urutan Server Action yang konsisten, dan sistem token warna yang sudah lengkap.

## 2. Fitur existing yang bisa dipakai ulang

Tidak perlu ditulis ulang:

- [`monthToRange()`](src/lib/date.ts:114) — fondasi semua agregasi bulanan
- [`formatRupiah()`](src/lib/money.ts:28), `parseRupiahInput()`, `MAX_RUPIAH` —
  disiplin integer sudah benar dan konsisten dengan syarat di spec §23
- [`calcWealth()`](src/lib/wealth.ts:40) — sudah pure, tinggal diperluas
- [`receivable-rules.ts`](src/lib/receivable-rules.ts) — pola "aturan bisnis pure
  + tes" yang harus ditiru untuk semua fitur baru
- [`getAccountBalances()`](src/server/queries/finance.ts:123) — sudah mengembalikan
  income/expense/balance per akun
- [`getCategoryBreakdown()`](src/server/queries/finance.ts:57) — total per kategori
  per bulan, dasar untuk budget
- [`getMonthSummary()`](src/server/queries/finance.ts:23) — income/expense/net
- Statistik piutang sudah benar memisahkan "pengeluaran riil" dari peminjaman
- Primitif UI: `Card`, `CardHeader`, `StatCard`, `Button`, `Form`, `Alert`,
  `EmptyState`, `ConfirmDialog`, `ConfirmSubmitButton`, `PageSkeleton`
- `NavLinks` + `SidebarNav` tinggal ditambah entri menu baru

## 3. Masalah yang ditemukan

1. **Tidak ada Transfer.** `TransactionKind` hanya `INCOME | EXPENSE`. Spec §9
   menuntut transfer tidak boleh jadi income/expense — butuh model sendiri.
2. **Tidak ada konsep "dana tujuan" yang mengunci uang.** Spec §1 dan TEST 3
   menuntut Available to Spend ≠ total saldo.ainer ini tidak ada sama sekali.
3. **Tidak ada Budget** (bulanan maupun mingguan) — spec §2 dan §3.
4. **Tidak ada Goal / Sinking Fund / Recurring / Snapshot bulanan** — spec §4–7, 10, 15.
5. **`AccountType` belum membedakan peran akun.** Sekarang `TUNAI|BANK|EWALLET|KREDIT`;
   spec §11 mau rekening gaji/tabungan/dana nikah/dana darurat dipisahkan.
6. **`Category` tidak punya grup maupun induk.** Spec §12 mau pengelompokan
   (KEWAJIBAN/TRANSPORT/GAYA HIDUP/PERSONAL CARE/KEUANGAN) dan §8 mau subkategori.
7. **Warna kategori masih hex mentah menyala** (`#f97316`, `#ec4899`, … di
   [`seed.ts`](prisma/seed.ts:12)) — bertentangan dengan prinsip palet lembut di
   `AGENTS.md` §4.3.
8. **Ada kebocoran warna mentah:** [`WealthCard.tsx`](src/components/WealthCard.tsx:24)
   memakai `to-[#1b5e62]`, melanggar aturan token.
9. **Tidak ada primitive ProgressBar** di `src/components/ui/` padahal spec
   memakainya di mana-mana.
10. **Tidak ada `weekToRange()`** di `src/lib/date.ts`, padahal `monthToRange()` ada.
    Budget mingguan (spec §3) tidak bisa dihitung tanpa itu.
11. **`calcWealth()` belum ada tesnya**, padahaluling murni yang fragile.
12. **`getAccountBalances()` agregasi seluruh riwayat tanpa batas** — akan makin
    berat seiring waktu; perlu dipecah atau diindeks.

## 4. Keputusan arsitektur yang perlu diambil (blocking)

### Keputusan 1 — Di mana uang "dana tujuan" secara fisik?

Ini risiko **double counting** terbesar, dan harus diputuskan sebelum nulis kode.

Spesifikasi menyebut **dua hal** yang bisa berarti cuentasama:
- §11 "Rekening Dana Nikah" sebagai tipe akun
- §4 "Dana Nikah" sebagai goal dengan saldo & progress

Kalau goal punya saldo sendiri **dan** uangnya juga ada di sebuah akun, total
kekayaan akan menghitung uang yang sama dua kali.

Tiga pilihan:

| Opsi | Cara kerja | Konsekuensi |
| --- | --- | --- |
| **A. Goal = reservasi** *(disarankan)* | Saldo goal **tidak** disimpan terpisah; uangnya tetap di akun. Goal hanya mencatat "seberapa yang sudah dikunci". | Total kekayaan tetap benar. `Available to Spend = cash − total terkunci`. Paling sedikit data baru. |
| B. Goal punya rekening sendiri | Wajib ada akun khusus per goal, saldo goal = saldo akun. | Paling banyak data, dan user harus disiplin membuat rekening per goal. |
| C. Goal punya saldo virtual | Goal punya saldo sendiri, uang tetap di akun umum. | **Berbahaya** — saldo goal dan saldo akun bisa berbeda, lalu total kekayaan meledak. |

Rekomendasi: **opsi A**. Amount goal = `sisa target − saldo terkumpul` yang
dihitung dari `GoalContribution`, dan setiap kontribusi adalah **Transfer** dari
akun likuid ke akun dana-tujuan. Dengan begitu:

- Total kekayaan = jumlah saldo akun + piutang → **terhitung sekali**
- Available to Spend = saldo akun likuid − (terkunci di goal + sinking fund)
- Tidak ada kolom saldo yang bisa melenceng

### Keputusan 2 — Apa itu "Available to Spend"?

Rumus yang dipakai:

```
Available to Spend
  = cash akun likuid
  − piutang jatuh tempo yang belum dibayar
  − saldo terkunci di seluruh goal aktif
  − saldo sinking fund
  − budget bulan berjalan yang belum terpakai (sisa alokasi)
```

Setiap pengurang harus bisa diaudit dan ditampilkan terpisah, supaya angka ini
bisa dipercaya user — bukan sekadar satu hasil hitung yang tidak dijelaskan.

## 5. Database table existing

Tidak di-drop. Semua perubahan bersifat **aditif**.

| Model | Isi |
| --- | --- |
| `Account` | id, name, type, initialBalance, isArchived |
| `Category` | id, name, kind, color, isArchived |
| `Transaction` | id, occurredAt, amount, kind, description, notes, accountId, categoryId |
| `Receivable` | id, personName, title, amount, lentAt, dueAt, notes, isCancelled, lentTransactionId |
| `ReceivablePayment` | id, receivableId, amount, receivedAt, notes, transactionId |

## 6. Migration yang diperlukan

Satu migration additive: `add_finance_planner`. Tidak ada drop maupun
perubahan destruktif pada tabel existing.

**Perubahan pada tabel existing**

- `Transaction`: `transferId String?` (FK ke `Transfer`, `SetNull`)
- `Account`: `purpose String?` — peran akun: `LIQUID | SAVINGS | GOAL_FUND | EMERGENCY`
- `Category`: `groupKey String?`, `parentId String?` (self-FK, `SetNull`)

**Tabel baru**

| Tabel | Isi | Relasi |
| --- | --- | --- |
| `Transfer` | amount, occurredAt, notes, fromAccountId, toAccountId | Account ×2 |
| `Budget` | monthKey, note, isClosed | — |
| `BudgetLine` | budgetId, categoryId, amount | Budget, Category |
| `WeeklyBudget` | weekKey, label, amount, isCarriedOver | — |
| `Goal` | name, targetAmount, monthlyContribution, deadline, status | — |
| `GoalContribution` | goalId, amount, occurredAt, transferId?, notes | Goal, Transfer |
| `SinkingFund` | name, targetAmount, monthlyContribution, neededAt, status | — |
| `SinkingFundContribution` | sinkingFundId, amount, occurredAt, transferId?, notes | SinkingFund, Transfer |
| `RecurringRule` | name, kind, amount, accountId, categoryId, dueDay, frequency, isActive, mode | Account, Category |
| `MonthlySnapshot` | monthKey, income, expense, savingRate, availableToSpend, detailJson | — |

Catatan: `detailJson` dipakai supaya snapshot bisa menyimpan rincian
budget-vs-realisasi tanpa membuat tabel turunan yang cepat basi.

## 7. File yang perlu diubah

| File | Perubahan |
| --- | --- |
| [`prisma/schema.prisma`](prisma/schema.prisma) | field & model baru (lihat §6) |
| [`prisma/seed.ts`](prisma/seed.ts) | grup kategori, warna lembut, template plan awal |
| [`src/lib/types.ts`](src/lib/types.ts) | enum `TransactionKind` +`TRANSFER`, `AccountPurpose`, enum status budget/goal |
| [`src/lib/money.ts`](src/lib/money.ts) | tidak diubah |
| [`src/lib/date.ts`](src/lib/date.ts) | tambah `weekToRange()`, `weeksInMonth()` |
| [`src/lib/wealth.ts`](src/lib/wealth.ts) | tambah `calcAvailableToSpend()` |
| [`src/app/globals.css`](src/app/globals.css) | token status budget (aman/waspada/over) |
| [`src/components/WealthCard.tsx`](src/components/WealthCard.tsx) | buang hex `to-[#1b5e62]` → token |
| [`src/components/layout/NavLinks.tsx`](src/components/layout/NavLinks.tsx) | entri menu Anggaran & Target |
| [`src/app/page.tsx`](src/app/page.tsx) | susun ulang sesuai prioritas §25 |
| [`AGENTS.md`](AGENTS.md) | tambah aturan baru setelah polanya stabil |

## 8. File baru yang perlu dibuat

**Library murni (wajib + tes)**

- `src/lib/budget-rules.ts` — status AMAN/WASPADA/HAMPIR HABIS/OVER
- `src/lib/goal-rules.ts` — progress, estimasi bulan tercapai, simulasi
- `src/lib/sinking-fund-rules.ts`
- `src/lib/insight-rules.ts` — semua insight (netral, tanpa menghakimi)
- `src/lib/transfer-rules.ts`
- `src/lib/available-to-spend.ts`

**Server**

- `src/server/actions/{transfers,budgets,goals,sinking-funds,recurring,snapshots}.ts`
- `src/server/queries/{budgets,goals,sinking-funds,insights}.ts`

**Validasi**

- `src/lib/validations/{transfer,budget,goal,sinking-fund,recurring}.ts`

**Routes**

- `src/app/anggaran/` (+ `loading.tsx`)
- `src/app/target/` (+ `loading.tsx`, `src/app/target/[id]/`)
- `src/app/dana-berkala/`
- `src/app/transaksi/transfer/`
- `src/app/laporan/`

**Komponen**

- `src/components/ui/ProgressBar.tsx`
- `src/components/ui/StatusBadge.tsx`
- `src/components/budget/*`, `src/components/goals/*`, `src/components/insights/*`
- `src/components/AvailableToSpendCard.tsx`

## 9. Implementation plan

| Phase | Isi | Selesai bila |
| --- | --- | --- |
| **1** | Transfer + `Account.purpose` + `calcAvailableToSpend` + token sampingan | TEST 1–2 hijau, saldo transfer tidak mengubah total aset |
| **2** | Budget bulanan + grup kategori | TEST 4 hijau, status 4 tingkat benar |
| **3** | Goal + kontribusi (pakai transfer) | Progress & estimasi benar, saldo menumpuk |
| **4** | Dana Darurat sebagai goal | TEST 3 hijau: Available ≠ saldo |
| **5** | Sinking fund | TEST 5 hijau: saldo tidak reset tiap bulan |
| **6** | Budget mingguan + `weekToRange()` | Sisa minggu tidak otomatis bocor ke minggu depan |
| **7** | Recurring (mode reminder, bukan auto-post) | Tidak mengubah saldo sampai dicatat |
| **8** | Dashboard sesuai prioritas §25 | 8 prioritas tampil berurutan, mobile rapi |
| **9** | Insight (perhitungan lokal, netral) | 8 contoh insight terpenuhi, tidak menghakimi |
| **10** | Monthly closing + snapshot | Tidak menghapus transaksi |
| **11** | Simulasi target | Sesuai §19, tidak memaksa user |
| **12** | Polish UI | Semua route 200, tes/lint/build hijau |

Setiap phase wajib melewati: `npm test` · `npm run lint` · `npx tsc --noEmit` ·
`npm run build` · smoke test semua route.

## 10. Yang perlu dikonfirmasi sebelum mulai

1. **Keputusan 1** — opsi A, B, atau C? (disarankan A)
2. Apakah Dana Nikah & Dana Darurat boleh memakai rekening fisik terpisah,
   atau selalu rekening likuid yang sama dengan "penguncian" virtual?
3. Migration cukup satu, atau dipecah per phase supaya lebih mudah di-rollback?
