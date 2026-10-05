# AGENTS.md — konteks pengerjaan proyek "Keuangan Pribadi"

Berkas ini adalah **briefing untuk siapa pun yang mengerjakan kode di repo ini**
(manusia atau AI agent). Isinya aturan dan jebakan yang sudah diverifikasi,
supaya perubahan berikutnya tidak mengulang kesalahan lama.

> Untuk penjelasan *apa* aplikasinya, lihat [`README.md`](README.md).
> Dokumen ini soal *bagaimana* mengubahnya dengan aman.

**Cara pakai:** baca bagian 1 → 2 → 3 dulu (wajib). Bagian 4–7 cuma perlu kalau
kamu menyentuh area itu. Bagian 9 adalah definisi selesai.

---

## 1. Perintah

```bash
npm run dev          # server dev, HANYA di 127.0.0.1:3000
npm run build        # build produksi -> .next-build
npm start            # jalankan hasil build
npm run lint         # ESLint
npm test             # Vitest, sekali jalan
npm run test:watch   # Vitest mode watch

npm run db:migrate   # buat + terapkan migrasi
npm run db:seed      # isi data awal (aman diulang)
npm run db:reset     # HAPUS database lalu migrate + seed
npm run db:backup    # salin database ke prisma/backups/
npm run db:studio    # Prisma Studio
```

Butuh Node 20+ dan npm 10+.

**`db:reset` menghapus semua data.** Kalau ragu, jalankan `npm run db:backup`
dulu.

---

## 2. Aturan yang tidak boleh dilanggar

Kalau salah satu ini dilanggar, data keuangan ikut rusak. Ini bukan soal
selera gaya.

### 2.1 `amount` selalu positif dan muat di `Int` 32-bit

- Arah aliran uang ditentukan oleh `kind` (`INCOME` / `EXPENSE`), **bukan** tanda
  angka. Tidak ada nominal negatif yang tersimpan di database.
- Batas keras: `MAX_RUPIAH = 2_147_483_647` (`src/lib/money.ts`).
- Format rupiah **tanpa sen**. Nominal desimal tidak ada dalam model ini.
- Tanda minus hanya boleh muncul di perhitungan aritmetika di memori — pakai
  `signedAmount(amount, kind)` dari `src/lib/money.ts`, jangan menuliskannya manual.
- **Jangan pakai `BigInt`.** Nilainya tidak bisa di-`JSON.stringify()` dan akan
  memicu error "Props must be serializable" saat melewati batas Server Component
  ke Client Component.

### 2.2 Tanggal disimpan sebagai UTC midnight

`Transaction.occurredAt` adalah UTC midnight dari tanggal lokal Asia/Jakarta.
Input `2026-10-01` menjadi `2026-10-01T00:00:00.000Z`.

- Membentuk tanggal dari input form **hanya lewat** `toUtcMidnight()`
  (`src/lib/date.ts`).
- Agregasi bulanan **harus** lewat `monthToRange()` yang menghasilkan rentang
  setengah terbuka `[awal, akhir)` dalam batas UTC.
- **Jangan pernah** pakai `new Date("2026-10-01")` langsung — string itu di-parse
  sebagai UTC dan bisa meleset sehari.

Alasannya SQLite menyimpan `DATETIME` sebagai teks dan membandingkannya secara
leksikografis. Tanpa normalisasi UTC, batas bulan tidak konsisten dan transaksi
melompat ke bulan tetangga.

### 2.3 Enum = `String` di database, divalidasi dua lapis

Prisma tidak mendukung `enum` pada SQLite. Field `Account.type`,
`Category.kind`, dan `Transaction.kind` disimpan sebagai teks.

- Nilai enum yang sah: konstanta di [`src/lib/types.ts`](src/lib/types.ts).
- Validasi lapis 1: union type di `types.ts` (`isTransactionKind`, `isAccountType`).
- Validasi lapis 2: zod di `src/lib/validations/`.
- Menambah nilai enum berarti mengubah **tiga** tempat itu, bukan hanya satu.

### 2.4 Hapus versus arsip

`onDelete: Restrict` pada relasi `Transaction`. Akun atau kategori yang masih
dipakai transaksi **tidak bisa dihapus** — itu memang disengaja. Untuk
menyembunyikan sesuatu dari form, pakai `isArchived`, bukan hapus.

Arsip bukan berarti uang hilang; **akun terarsip tetap dihitung di total
kekayaan** (lihat opsi `includeArchived` di `src/server/queries/finance.ts`).

### 2.5 Sisa piutang tidak disimpan

`remaining` selalu dihitung dari `amount` dikurangi total pembayaran, tidak pernah
disimpan sebagai kolom. Kolom yang dihitung ulang akan bisa melenceng dari
pembayarannya.

### 2.6 Transfer bukan income/expense

Perpindahan uang antar akun disimpan di tabel `Transfer`
([`prisma/schema.prisma`](prisma/schema.prisma)), **bukan** sebagai dua baris
`Transaction`. Kalau transfer dipecah jadi income + expense, arus kas, saving
rate, dan total kekayaan akan salah. Transfer boleh memengaruhi saldo akun, tapi
**dilarang** menyumbang ke `income`/`expense`.

Rumus saldo akun:

```
saldo = initialBalance + Σincome − Σexpense + ΣtransferMasuk − ΣtransferKeluar
```

### 2.7 Goal dan sinking fund = reservasi, bukan saldo terpisah

Uang dana tujuan **tetap tinggal di dalam saldo akun**. `Goal` hanya mencatat
"seberapa yang sudah dikunci", dihitung dari `GoalContribution` — tidak ada kolom
`saldo` pada goal. Kalau goal punya saldo sendiri sementara uangnya juga ada di
akun, uang yang sama terhitung dua kali di total kekayaan.

Atau dengan kata lain: anggarkan "Uang Aman Digunakan" sebagai
`kas likuid − yang terkunci`, bukan `kas likuid + saldo goal`.

Perhitungannya ada di [`calcAvailableToSpend()`](src/lib/available-to-spend.ts) dan
sudah dikunci tesnya.

---

## 3. Pola Server Action

Semua mutasi lewat Server Action (`'use server'`) dengan urutan ini:

1. `zod.safeParse` isian `FormData`
2. cek integritas di database (akun ada dan aktif, kategori cocok `kind`)
3. tulis lewat `db.$transaction` bila menyentuh lebih dari satu tabel
4. `revalidateFinancePages()` atau `revalidateReceivable()`
5. `redirect()` ke daftar

Aturan tambahan:

- **`redirect()` harus DI LUAR blok `try`.** `redirect()` melempar exception
  `NEXT_REDIRECT`; kalau ada di dalam `try`, exception itu tertangkap dan
  dianggap kegagalan.
- Kembalikan `ActionResult` (`src/lib/types.ts`). Untuk gagal, pakai
  `actionError(...)`.
- Galat Prisma diterjemahkan lewat `describePrismaError()` supaya pesan ke user
  Bahasa Indonesia, bukan error mentah.
- Form memakai `useActionState`, jadi pesan tampil inline di bawah field yang
  salah tanpa memuat ulang halaman.

### 3.1 Validasi yang menentukan penulisan harus di dalam `$transaction`

**Ini jebakan yang pernah ada di proyek ini dan sekarang sudah diperbaiki.**

Polanya disebut check-then-act: membaca data untuk validasi **di luar**
transaksi, lalu membuka transaksi terpisah untuk menulis. Dua request yang
hampir bersamaan bisa sama-sama lolos validasi berdasarkan data yang sama, lalu
dua-duanya menulis.

Contoh yang sudah diperbaiki di `src/server/actions/receivables.ts`:
`getPaidTotal()` sekarang menerima client transaksi, dan seluruh validasi
"tidak melebihi sisa" dijalankan **di dalam** callback `$transaction` yang sama
dengan penulisan. Hal yang sama diterapkan di `addPayment()` dan
`updateReceivable()`.

Aturan umumnya:

> Kalau nilai yang dibaca hanya untuk **memutuskan boleh atau tidaknya** sebuah
> penulisan, pembacaan itu wajib terjadi di dalam transaksi yang sama dengan
> penulisan.

Nilai balik dari callback transaksi memakai discriminant `status: "ok" | "error"`,
bukan operator `in`, supaya TypeScript bisa melakukan narrowing dengan benar.
`ActionResult` sendiri sudah berupa union, jadi `in` tidak bisa membedakan.

---

## 4. Sistem desain

### 4.1 Wajib memakai token semantik

Semua warna ditulis lewat nama peran: `bg-surface`, `text-muted-foreground`,
`border-border`, `text-income`, `text-sidebar-muted`, dan seterusnya.

**Dilarang** menulis warna mentah seperti `bg-slate-100`, `text-gray-500`,
`#64748b`, atau `rgb(...)`. Mode gelap hanya mungkin bekerja karena token di
[`src/app/globals.css`](src/app/globals.css) ditukar dalam satu blok `.dark`.

**Dilarang** menulis varian `dark:` di dalam komponen. Kalau sebuah komponen
memerlukan perbedaan dark dan light, itu artinya kontrak tokennya belum lengkap.

### 4.2 Sidebar punya palet terpisah

Sidebar adalah satu-satunya bidang berwarna besar di layout, jadi ia punya token
`sidebar-*` sendiri — bukan `surface` atau `foreground`. Menyamakan teks sidebar
dengan `text-foreground` akan merusak kontrasnya.

Mode terang memakai gradien pastel dengan teks gelap. Mode gelap memakai gradien
navy dengan teks terang.

### 4.3 Karakter palet: lembut, bukan menyala

Prinsipnya: kroma ditahan rendah, dan luminansi gelap tidak pernah hitam penuh.

| Aturan | Contoh |
| --- | --- |
| Teks gelap = navy lembut | `oklch(0.29 0.022 240)`, bukan hitam atau abu-abu |
| Hijau/merah status = earth tone | sage dan terracotta, bukan primer menyala |
| Kroma ideal di rentang `0.005`–`0.13` | di atas itu langsung terasa menusuk mata |
| Glow latar ber-alpha kecil | `color-mix(..., 7%`–`11%)`, bukan 15% ke atas |

Kalau menambah warna baru, ikuti skala yang sudah ada. Jangan menaikkan
saturasi "supaya lebih kelihatan" — naikkan kontras lewat luminansi saja.

#### 4.3.1 Warna lembut belum tentu terbaca

Warna yang terlihat lembut ternyata sering gagal WCAG. Semua token di
[`src/app/globals.css`](src/app/globals.css) **sudah dihitung** terhadap latar
yang benar-benar dipakai, jadi angka yang ada di sana boleh dipakai apa adanya.
Kalau menambah atau mengubah token, hitung ulang — jangan menebak dari
penampilan.

- **Teks** wajib `4.5:1` terhadap **setiap** latar tempat ia muncul:
  `background`, `surface`, `surface-muted`, dan `surface-hover`. Latar hover ikut
  dihitung karena baris list memakai `hover:bg-surface-hover`; teks harus tetap
  terbaca tepat saat kursor lewat.
- **Teks status** (`income`, `expense`, `destructive`, `warning`) juga wajib
  `4.5:1` terhadap `-soft` masing-masing, karena dipakai sebagai chip compact.
- **Non-teks** (garis, cincin fokus, border) cukup `3:1` — tetap wajib karena
  menandai batas komponen.

Dua konsekuensi yang sudah tercatat di token:

- `subtle-foreground` harus gelap di mode terang. Nilai yang terasa "cukup navy"
  pernah hanya `2.95:1` di atas `surface-muted`.
- Mode gelap tidak boleh "dibalik" begitu saja. Warna terang di atas latar
  gelap otomatis punya kontras besar, jadi yang perlu dijaga di sana justru
  **kroma** supaya tidak menyala, bukan kontrasnya.

### 4.4 Motion

- Semua animasi wajib mati otomatis di bawah `prefers-reduced-motion: reduce`.
  Blok globalnya sudah ada di `globals.css`.
- Animasi dekoratif (misalnya `animate-drift` di sidebar) selalu diberi
  `aria-hidden` dan `pointer-events-none` supaya tidak pernah menahan klik.

### 4.5 Ikon

Ikon garis adalah komponen React di
[`src/components/Icons.tsx`](src/components/Icons.tsx). **Jangan** menambah
paket ikon eksternal, karena prinsip proyek ini tidak ada request jaringan
tambahan. Butuh ikon baru → tambah komponen SVG di berkas itu; kalau memang
tidak ada yang cocok, reuse yang paling dekat.

### 4.6 Primitif UI

Pakai yang sudah ada di `src/components/ui/` sebelum membuat komponen baru:
`Card`, `CardHeader`, `Button`/`buttonStyles`, `Form`, `Input`, `Select`,
`FormField`, `EmptyState`, `Alert`, `ConfirmDialog`, `ConfirmSubmitButton`, dan
`PageSkeleton`.

`buttonStyles()` dipakai saat elemennya `Link`, bukan `<button>`.

---

## 5. Tes

[`vitest.config.mts`](vitest.config.mts) hanya memuat `src/**/*.test.ts`, dengan
environment node dan tanpa mock database. **Status saat ini: 6 berkas, 89 tes,
semua hijau.**

| Berkas | Cakupan |
| --- | --- |
| [`src/lib/money.test.ts`](src/lib/money.test.ts) | format, parse, batas 32-bit |
| [`src/lib/date.test.ts`](src/lib/date.test.ts) | batas bulan UTC, shift, tanggal palsu |
| [`src/lib/receivable-rules.test.ts`](src/lib/receivable-rules.test.ts) | aturan bisnis piutang |
| [`src/lib/transfer-rules.test.ts`](src/lib/transfer-rules.test.ts) | transfer tidak menggeser cashflow |
| [`src/lib/available-to-spend.test.ts`](src/lib/available-to-spend.test.ts) | uang aman dipakai, dana terkunci |
| [`src/lib/validations/transaction.test.ts`](src/lib/validations/transaction.test.ts) | skema zod |

Aturan:

- **Logika bisnis wajib pure** di `src/lib/` supaya bisa diuji tanpa database.
  Kalau sebuah aturan masih butuh query di dalamnya, itu tanda aturannya belum
  dipisah dengan benar.
- Setiap aturan baru di `src/lib/` **wajib** diikuti tes. Kalau tesnya belum ada,
  pekerjaan belum selesai.
- Tes tidak boleh bergantung pada waktu sekarang. Untuk "hari ini", injeksikan
  nilainya — `overdueFlags()` menerima `today` sebagai parameter karena itu.

---

## 6. Jebakan yang sudah pernah terjadi

Semua ini sudah diperbaiki, tapi mekanismenya masih bisa terulang kalau tidak
ingat.

| Jebakan | Kenapa |
| --- | --- |
| **Warna status lolos di atas `surface`, tapi gagal di atas `-soft`** | Chip compact memakai `bg-income-soft`, bukan `surface`. Mengukur hanya terhadap `surface` membuat chip lolos padahal tidak terbaca. |
| **Teks lolos di atas `surface`, gagal di atas `surface-muted`** | Bedanya hanya ~0.04 luminansi, tapi cukup untuk menembus ambang. Uji terhadap latar **paling gelap** dari yang dipakai teks itu. |
| **`dark:` muncul diam-diam saat menambah kartu peringatan** | Amber paling sering ditulis langsung karena "kelihatan cocok untuk peringatan". Dua kartu penjelasan piutang sempat memakai `border-l-amber-400` + `dark:bg-amber-400/15`. Sekarang ada token `warning-*`; pakai itu. |
| **`.next` versus `.next-build`** | `next build` dan `next dev` memakai folder berbeda lewat `distDir` di `next.config.ts`. Kalau keduanya menunjuk `.next`, chunk dev tertimpa dan muncul `Cannot find module './xxx.js'`. Jangan pernah mengarahkan env `NEXT_DIST_DIR` saat dev. |
| **ESLint ikut memindai `.next-build`** | Nama folder `.next-build` baru ada setelah config ignore ditulis. Begitu `npm run build` pernah dijalankan, lint meledak jadi ratusan error palsu dari file hasil build. Kedua folder itu **wajib** ada di `ignores`. |
| **`notFound()` mengembalikan HTTP 200** | Untuk route dinamis, halaman 404 kustom **tampil**, tapi status-nya tetap 200, baik di dev maupun produksi. Ini perilaku streaming bawaan Next.js (header terkirim sebelum `notFound()` dieksekusi), bukan bug aplikasi. `force-dynamic` tidak menghilangkannya. |
| **`DATABASE_URL` relatif itu relatif ke `prisma/`** | `file:./dev.db` berarti `prisma/dev.db`, bukan `./dev.db`. Prisma menyelesaikannya terhadap lokasi `schema.prisma`. Kalau menulis skrip yang membuka path sendiri, tirukan aturan yang sama. |
| **Backup jangan pakai `cp`** | SQLite menulis per halaman, jadi menyalin berkasnya saat server hidup bisa menghasilkan salinan setengah tertulis. Pakai `VACUUM INTO` seperti di [`scripts/backup-db.ts`](scripts/backup-db.ts). |
| **Prisma client perlu di-regenerate** | Setelah `prisma migrate` menambah model baru, dev server masih memegang client lama. Restart dev server; kalau `tsc` masih bilang properti baru tidak ada, hapus `tsconfig.tsbuildinfo` lalu jalankan `npx prisma generate`. |

---

## 7. Batasan yang disengaja

- **Tidak ada autentikasi.** Aplikasi ini locality-only. Karena itu `dev` dan
  `start` dibatasi ke `127.0.0.1` lewat `--hostname`. Jangan dihapus tanpa
  bersamaan menambah autentikasi — kalau tidak, siapa pun di LAN bisa menghapus
  seluruh data keuangan.
- **SQLite dengan satu penulis.** Cukup untuk satu pengguna. Jangan mengandalkan
  konkurensi tulis.
- **Halaman yang membaca database** perlu `export const dynamic = "force-dynamic"`
  supaya tidak ikut ter-baked ke HTML saat build. Halaman yang sudah otomatis
  dinamis karena memakai `searchParams` atau `params` dinamis tidak memerlukannya.
- **Tidak ada service eksternal.** Tidak boleh menambah fetch ke API luar, font
  remote, atau analytics tanpa diminta.

---

## 8. Bahasa dan gaya

- **Komentar dan teks UI memakai Bahasa Indonesia.** Ini berlaku juga untuk
  komentar di dalam kode, bukan cuma yang dilihat pengguna.
- Komentar menjelaskan **kenapa**, bukan apa. Kalau kodenya sudah jelas, jangan
  diberi komentar.
- Nilai enum, warna, dan pesan error tetap Bahasa Indonesia; nama variabel dan
  identifier tetap Bahasa Inggris.
- Fungsi tanggal dan uang selalu diberi komentar yang menjelaskan keputusan
  desainnya.

---

## 9. Definition of Done

Sebelum menyatakan selesai, semua harus hijau:

```bash
npm test              # tes lolos
npm run lint          # 0 error
npx tsc --noEmit      # 0 error
npm run build         # build sukses
```

Plus:

- [ ] Setiap aturan atau validasi baru punya tes di `src/lib/*.test.ts`
- [ ] Validasi yang menentukan penulisan berada di dalam `$transaction` yang sama
- [ ] Tidak ada warna mentah atau varian `dark:` di komponen
- [ ] Warna baru mengikuti skala lembut yang ada (kroma rendah)
- [ ] Elemen dekoratif diberi `aria-hidden` dan `pointer-events-none`
- [ ] Halaman yang membaca DB punya `force-dynamic` kalau memang diperlukan
- [ ] Route baru punya `loading.tsx` bila halaman butuh suspense, dan tetap punya
      tampilan 404 atau empty state yang masuk akal
- [ ] Kalau skema berubah, migration dibuat lewat `npm run db:migrate`, bukan
      `db:push`
- [ ] Smoke test: semua route balas 200, dan route tidak valid balas 404

---

## 10. Peta jalan

Daftar fitur yang sudah direncanakan ada di bagian "Peta jalan v2" pada
[`README.md`](README.md). Kalau mengerjakan salah satu, **perbarui juga README** —
dokumen itu yang dipakai pengguna, sedangkan berkas ini untuk pengerjaan.