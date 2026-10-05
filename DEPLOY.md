# Deploy Keuangan di VM ini (2026-10-05)

Repo: https://github.com/Dimassaputra1616/Keuangan.git → `~/workspace/keuangan/`

## Cara jalanin

```bash
bash ~/workspace/keuangan/start.sh   # idempoten: tidak dobel kalau sudah jalan
```

- Production build (`npm run build` → `.next-build/`), serve via `npm start`
- URL: http://127.0.0.1:3000 (hanya localhost, sesuai desain repo)
- DB: `prisma/dev.db` (SQLite), sudah migrate + seed (14 kategori, 1 akun "Dompet Tunai")
- Log: `server.log`

## Update kode

```bash
cd ~/workspace/keuangan && git pull && npm install && npm run build
bash start.sh   # restart: pkill dulu proses lama bila perlu
```

Restart manual: `pkill -f "[n]ext-server" && bash start.sh`

## Akses publik (2026-10-05) — KESIMPULAN: tidak memungkinkan dari VM ini

Dicoba 7 cara, semua gagal karena proxy egress mencegat semua TLS langsung:
cloudflared (abaikan proxy), pinggy SSH langsung (ditutup proxy),
localhost.run (port 22 diblokir), localtunnel (hang), inbound (IP privat/NAT),
ngrok (ERR_NGROK_9009: proxy = fitur berbayar), pinggy via SSH+proxy (tembus
1x lalu diblokir). Opsi disodorkan ke user: jalanin di laptop / Hugging Face
Spaces / Tailscale. Ngrok authtoken user tersimpan di ~/.config/ngrok/ngrok.yml
(0600) — tidak jadi dipakai.
- `tunnel-watchdog.sh` — cron tiap 10 mnt: jaga app + ngrok tetap hidup.

## Catatan

- Tanpa login (by design). JANGAN expose ke publik/LAN tanpa tambah auth dulu —
  README repo sendiri bilang siapa pun bisa hapus seluruh data.
- Akses publik dari VM ini saat ini tidak memungkinkan (proxy egress memblokir
  tunnel: sudah terbukti saat percobaan 9Router 2026-10-04).
- Belum ada watchdog cron. Kalau mau auto-restart, tinggal bilang.

## 2026-10-05 — DEPLOYED ke Vercel + Prisma Postgres (PRODUKSI)

**URL publik:** https://keuangan-kappa-blue.vercel.app
**Login:** username `bangdim` (password di `.env` lokal, JANGAN di-commit)

### Arsitektur
- Hosting: Vercel (project `keuangan`, Hobby)
- Database: Prisma Postgres via Vercel Storage (`prisma-postgres-indigo-lens`)
- Env vars di Vercel: `DATABASE_URL` (pooled), `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`
- Build: `prisma migrate deploy && prisma db seed && next build` (vercel.json)

### Migrasi SQLite → Postgres
- `prisma/schema.prisma`: provider `postgresql` (String tetap dipakai untuk enum,
  validasi tidak berubah)
- Migrasi SQLite lama dipindah ke `prisma/migrations-sqlite-backup/`
- Baseline Postgres baru: `prisma/migrations/0_baseline/`
- `migration_lock.toml`: provider postgresql

### Yang dicoba dan GAGAL (jangan diulang)
- Tunnel dari VM (cloudflared, ngrok, pinggy, localhost.run, localtunnel): proxy egress memblokir semua
- Tailscale: registrasi ke control plane timeout via proxy
- Hugging Face Spaces: token valid tapi Docker Spaces butuh PRO
- Oracle Cloud: user menolak (ribet)
- Supabase: project hidup tapi pooler tidak mengenal tenant ("ENOTFOUND tenant/user") — masalah provisioning di sisi Supabase

### Catatan
- Deploy via Vercel CLI dari direktori ini (`npx vercel --prod`), BUKAN via GitHub import
- Kode Postgres ini BELUM di-push ke GitHub (butuh akses write ke repo)
- Server lokal VM (SQLite) tetap jalan di 127.0.0.1:3000 sebagai cadangan

## 2026-10-05 — Halaman login elegan (ganti Basic Auth popup)

Basic Auth via popup browser diganti form login di `/login`:
- `src/lib/auth.ts`: token sesi HMAC-SHA256 (Web Crypto, jalan di Edge+Node)
- `src/server/actions/auth.ts`: action `login`/`logout`, cookie httpOnly 30 hari
- `src/middleware.ts`: cek cookie sesi, redirect ke `/login` bila belum login
- `src/app/login/page.tsx`: halaman login standalone (tanpa sidebar)
- Route group `(app)`: halaman utama dipindah ke `src/app/(app)/` supaya
  login tidak kena AppShell. URL tidak berubah.
- Tombol Keluar di sidebar (`LogoutButton.tsx`).
- Tes: `src/lib/auth.test.ts` (5 tes token).
