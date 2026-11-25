# 🚀 Panduan Deployment FinTrack (Web & Mobile)

Dokumentasi ini menjelaskan langkah-langkah untuk mendeploy aplikasi web **FinTrack** ke **Vercel** dan membangun paket APK Android menggunakan **Expo EAS Build**.

---

## 🌐 1. Deploy Aplikasi Web ke Vercel (Status: ✅ LIVE PRODUCTION)

Aplikasi web telah berhasil di-deploy ke Vercel Production:
* **Live Production URL:** [https://finance-tracker-taupe-six.vercel.app](https://finance-tracker-taupe-six.vercel.app)
* **Vercel Project Dashboard:** [https://vercel.com/dandy-rahmat-zains-projects/finance-tracker](https://vercel.com/dandy-rahmat-zains-projects/finance-tracker)

### ⚠️ Wajib saat meng-upgrade deployment yang sudah ada

Versi ini mengubah keamanan dan skema database. Lakukan langkah berikut **sebelum** men-deploy branch ini ke produksi:

1. **Set `SESSION_SECRET`** di Vercel (Settings → Environment Variables), minimal 32 karakter acak:
   ```bash
   openssl rand -base64 48
   ```
   Tanpa variabel ini, produksi menolak semua login (sengaja: secret yang tertulis di kode bisa dipakai siapa pun untuk memalsukan sesi). Semua pengguna perlu login ulang satu kali.
2. **Set `APP_URL`** ke URL publik aplikasi (dipakai di email reset/verifikasi).
3. **Migrasi database** (hanya jika memakai `DATABASE_URL`). Database lama dibuat dengan `prisma db push`, jadi tandai skema awal sebagai sudah diterapkan, lalu jalankan migrasi baru:
   ```bash
   DATABASE_URL=... DIRECT_URL=... pnpm --filter @fintrack/database exec prisma migrate resolve --applied 0_init
   DATABASE_URL=... DIRECT_URL=... pnpm db:deploy
   ```
   Untuk database baru, cukup `pnpm db:deploy`.
4. **Struk privat:** di Supabase Storage, ubah bucket `receipts` menjadi *private*, lalu set `SUPABASE_SERVICE_ROLE_KEY` (server-only, **jangan** diberi awalan `NEXT_PUBLIC_`). Struk lama tetap tampil karena aplikasi membuat signed URL dari path-nya.
5. **Pemindai AI:** set `GEMINI_API_KEY`. Model default sekarang `gemini-flash-latest` (model lama `gemini-1.5-flash` sudah dipensiunkan Google). Untuk demo tanpa API key, set `ENABLE_MOCK_AI=true` (sekarang berfungsi juga di produksi karena bersifat opt-in).
6. **Opsional:** `CRON_SECRET` (cron harian transaksi berulang di `vercel.json`), `RESEND_API_KEY` + `EMAIL_FROM` (email reset & verifikasi), `SENTRY_DSN` (pelaporan error).

Cek setelah deploy: `GET /api/health` harus mengembalikan `{"status":"ok","storage":"database"}`.

### Cara 1: Menghubungkan GitHub ke Vercel (Rekomendasi)
1. Kunjungi [vercel.com/new](https://vercel.com/new) dan masuk dengan akun GitHub Anda.
2. Cari repositori **`dandyzain/fintrack`** dan klik tombol **Import**.
3. Di panel konfigurasi proyek:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: biarkan default (`vercel.json` di root sudah menangani monorepo).
   - **Build Command**: `pnpm --filter @fintrack/database db:generate && pnpm --filter @fintrack/web build`
   - **Output Directory**: `apps/web/.next`
4. Masukkan **Environment Variables** (daftar lengkap & penjelasan ada di `.env.example`):
   | Key | Wajib? | Catatan |
   | :--- | :--- | :--- |
   | `SESSION_SECRET` | ✅ | ≥ 32 karakter acak |
   | `APP_URL` | ✅ | URL publik, mis. `https://fintrack-anda.vercel.app` |
   | `DATABASE_URL`, `DIRECT_URL` | Disarankan | Tanpa ini aplikasi berjalan di mode memori (data hilang saat restart) |
   | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Disarankan | Penyimpanan struk privat |
   | `GEMINI_API_KEY` atau `ENABLE_MOCK_AI=true` | Disarankan | Pemindai struk |
   | `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `SENTRY_DSN` | Opsional | Cron, email, monitoring |
5. Klik **Deploy**, lalu jalankan migrasi (`pnpm db:deploy`) ke database produksi.

### Cara 2: Deploy Cepat via Terminal (CLI)
Jalankan perintah berikut di PowerShell dari direktori `apps/web`:
```powershell
cd apps/web
npx vercel
```
Ikuti instruksi login di browser, dan Vercel akan otomatis mendeploy aplikasi Anda.

---

## 📱 2. Build APK Mobile Android via Expo EAS

Konfigurasi build telah disiapkan di `apps/mobile/eas.json` dengan profil `preview` yang langsung menghasilkan file installer **`.apk`**.

### Langkah-langkah Build:
1. Masuk ke direktori mobile:
   ```powershell
   cd apps/mobile
   ```
2. Login ke akun Expo Anda (buat akun gratis di [expo.dev](https://expo.dev) jika belum punya):
   ```powershell
   npx eas-cli login
   ```
3. Mulai proses build APK Android di cloud:
   ```powershell
   npx eas-cli build -p android --profile preview
   ```
4. EAS CLI akan menanyakan apakah ingin membuat project baru di akun Expo Anda, tekan **Y** (Yes).
5. EAS Cloud Builder akan mengompilasi APK (gratis). Setelah selesai, terminal akan memberikan **link download file `.apk`** dan **QR code**.
6. Anda dapat langsung mengunduh dan menginstal file APK tersebut di smartphone Android apa pun.

---

## 🔄 3. Otomatisasi CI/CD
* **GitHub Actions** (`.github/workflows/ci.yml`) berjalan di setiap push ke `main` dan setiap pull request: install dengan lockfile beku, typecheck, lint, tes unit & API, migrasi ke PostgreSQL sementara + cek *drift* skema, tes integrasi PostgreSQL, lalu build.
* **GitLab CI** (`.gitlab-ci.yml`) menjalankan langkah yang sama.
* **Monitoring:** `GET /api/health` untuk uptime check (200 = sehat, 503 = database tidak terjangkau); log server berformat JSON; error tak terduga dikirim ke Sentry jika `SENTRY_DSN` di-set.
