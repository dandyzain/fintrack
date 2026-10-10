# 🚀 Panduan Deployment FinTrack (Web & Mobile)

Dokumentasi ini menjelaskan langkah-langkah untuk mendeploy aplikasi web **FinTrack** ke **Vercel** dan membangun paket APK Android menggunakan **Expo EAS Build**.

---

## 🌐 1. Deploy Aplikasi Web ke Vercel (Status: ✅ LIVE PRODUCTION)

Aplikasi web telah berhasil di-deploy ke Vercel Production:
* **Live Production URL:** [https://finance-tracker-taupe-six.vercel.app](https://finance-tracker-taupe-six.vercel.app)
* **Vercel Project Dashboard:** [https://vercel.com/dandy-rahmat-zains-projects/finance-tracker](https://vercel.com/dandy-rahmat-zains-projects/finance-tracker)

### Cara 1: Menghubungkan GitHub ke Vercel (Rekomendasi)
1. Kunjungi [vercel.com/new](https://vercel.com/new) dan masuk dengan akun GitHub Anda.
2. Cari repositori **`dandyzain/fintrack`** dan klik tombol **Import**.
3. Di panel konfigurasi proyek:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Klik *Edit* lalu pilih `apps/web` (atau biarkan default karena `vercel.json` sudah menangani monorepo).
   - **Build Command**: `pnpm --filter @fintrack/web build`
   - **Output Directory**: `apps/web/.next`
4. Masukkan **Environment Variables**:
   | Key | Value (Contoh) | Catatan |
   | :--- | :--- | :--- |
   | `ENABLE_MOCK_AI` | `true` | Untuk pengujian tanpa API key |
   | `GEMINI_API_KEY` | *API Key Gemini Anda* | Untuk Vision AI OCR langsung |
   | `DATABASE_URL` | *URL PostgreSQL Supabase* | Opsional jika menggunakan cloud DB |
   | `NEXT_PUBLIC_SUPABASE_URL` | *URL Supabase Project* | Opsional untuk storage struk |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Anon Key Supabase* | Opsional untuk storage struk |
5. Klik **Deploy**. Dalam waktu ~1-2 menit, situs Anda akan aktif dengan domain publik gratis (misal: `https://fintrack-dandyzain.vercel.app`).

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
* **GitHub Actions**: File `.github/workflows/ci.yml` otomatis memvalidasi build dan dependensi setiap kali ada push ke branch `main`.
* **GitLab CI**: File `.gitlab-ci.yml` siap digunakan pada GitLab Runner.
