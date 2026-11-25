import type { Language } from "./translations";

/**
 * Privacy policy and terms, written to match what the app actually does.
 * The operator should review them (and adjust the contact section) before
 * relying on them for a public service.
 */

export interface LegalDoc {
  updated: string;
  intro: string;
  sections: { title: string; body: string[] }[];
}

export const LEGAL_UPDATED = "2026-11-25";

const privacy: Record<Language, LegalDoc> = {
  en: {
    updated: LEGAL_UPDATED,
    intro:
      "FinTrack is a personal finance app. This policy explains what we store, why, who processes it, and how you stay in control of it.",
    sections: [
      {
        title: "What we store",
        body: [
          "Account: your name, email address and a one-way hash of your password (we never store the password itself).",
          "Finance data you enter: pockets, transactions, categories, budgets and recurring schedules.",
          "Receipt photos you scan, and the text the AI extracted from them.",
          "Security records: short-lived counters used to block password guessing, and one-time links for password reset and email verification (stored only as hashes).",
        ],
      },
      {
        title: "Why we use it",
        body: [
          "Only to provide the app to you: showing your balances, reports and budgets, reading receipts you choose to scan, and keeping your account secure.",
          "We do not sell your data, show ads, or use your financial data to profile you.",
        ],
      },
      {
        title: "Who processes it",
        body: [
          "Hosting and database providers run the app and store its data.",
          "When you scan a receipt, the image is sent to an AI vision provider (Google Gemini, or OpenAI as a fallback) only to read it. Review the result before saving.",
          "If email is enabled, an email provider delivers password-reset and verification messages.",
        ],
      },
      {
        title: "How it is protected",
        body: [
          "Receipt images are stored privately and shown only through links that expire after one hour.",
          "Every request is checked against your session; changing or resetting your password signs out every other device.",
          "Connections are encrypted (HTTPS).",
        ],
      },
      {
        title: "How long we keep it",
        body: [
          "As long as your account exists. Deleting your account permanently removes your data and receipt images.",
          "Demo sandboxes are deleted automatically 24 hours after they are created.",
        ],
      },
      {
        title: "Your choices and rights",
        body: [
          "Download all of your data as JSON, or your transactions as CSV, from Settings.",
          "Correct your profile at any time, and delete your account (and all data) from Settings.",
          "These controls support your rights under data-protection laws such as Indonesia's Personal Data Protection Law (UU PDP).",
        ],
      },
      {
        title: "Contact",
        body: ["Questions about this policy can be sent to the operator of this FinTrack deployment."],
      },
    ],
  },
  id: {
    updated: LEGAL_UPDATED,
    intro:
      "FinTrack adalah aplikasi keuangan pribadi. Kebijakan ini menjelaskan data apa yang kami simpan, untuk apa, siapa yang memprosesnya, dan bagaimana kamu tetap memegang kendali.",
    sections: [
      {
        title: "Data yang kami simpan",
        body: [
          "Akun: nama, alamat email, dan hash satu arah dari kata sandimu (kata sandi aslinya tidak pernah disimpan).",
          "Data keuangan yang kamu masukkan: kantong, transaksi, kategori, anggaran, dan jadwal berulang.",
          "Foto struk yang kamu pindai, beserta teks yang dibaca AI dari struk tersebut.",
          "Catatan keamanan: penghitung sementara untuk memblokir tebakan kata sandi, serta tautan sekali pakai untuk reset kata sandi dan verifikasi email (hanya disimpan dalam bentuk hash).",
        ],
      },
      {
        title: "Untuk apa data digunakan",
        body: [
          "Hanya untuk menjalankan aplikasi bagimu: menampilkan saldo, laporan, dan anggaran, membaca struk yang kamu pilih untuk dipindai, serta menjaga keamanan akunmu.",
          "Kami tidak menjual datamu, tidak menampilkan iklan, dan tidak memakai data keuanganmu untuk membuat profil dirimu.",
        ],
      },
      {
        title: "Siapa yang memproses data",
        body: [
          "Penyedia hosting dan database menjalankan aplikasi dan menyimpan datanya.",
          "Saat kamu memindai struk, gambarnya dikirim ke penyedia AI vision (Google Gemini, atau OpenAI sebagai cadangan) hanya untuk dibaca. Periksa hasilnya sebelum disimpan.",
          "Jika email diaktifkan, penyedia email mengirimkan pesan reset kata sandi dan verifikasi.",
        ],
      },
      {
        title: "Cara data dilindungi",
        body: [
          "Foto struk disimpan secara privat dan hanya ditampilkan melalui tautan yang kedaluwarsa setelah satu jam.",
          "Setiap permintaan diperiksa terhadap sesimu; mengganti atau mengatur ulang kata sandi akan mengeluarkan semua perangkat lain.",
          "Koneksi dienkripsi (HTTPS).",
        ],
      },
      {
        title: "Berapa lama data disimpan",
        body: [
          "Selama akunmu ada. Menghapus akun akan menghapus permanen datamu beserta foto struknya.",
          "Sandbox demo dihapus otomatis 24 jam setelah dibuat.",
        ],
      },
      {
        title: "Pilihan dan hakmu",
        body: [
          "Unduh semua datamu dalam format JSON, atau transaksimu dalam CSV, dari halaman Pengaturan.",
          "Perbarui profilmu kapan saja, dan hapus akun (beserta seluruh data) dari halaman Pengaturan.",
          "Fitur-fitur ini mendukung hakmu menurut peraturan perlindungan data, seperti Undang-Undang Pelindungan Data Pribadi (UU PDP).",
        ],
      },
      {
        title: "Kontak",
        body: ["Pertanyaan tentang kebijakan ini dapat diajukan kepada pengelola layanan FinTrack ini."],
      },
    ],
  },
};

const terms: Record<Language, LegalDoc> = {
  en: {
    updated: LEGAL_UPDATED,
    intro: "By using FinTrack you agree to these terms. Please read them together with the Privacy Policy.",
    sections: [
      {
        title: "The service",
        body: [
          "FinTrack helps you record and understand your personal finances. It is a tracking tool: it does not move real money, connect to your bank, or give financial, tax or legal advice.",
          "Receipt scanning uses AI and can make mistakes. You are responsible for reviewing amounts before saving them.",
        ],
      },
      {
        title: "Your account",
        body: [
          "Keep your password secret and use a password you don't use elsewhere. You are responsible for activity under your account.",
          "Demo sandboxes are temporary and are deleted after 24 hours.",
        ],
      },
      {
        title: "Acceptable use",
        body: [
          "Don't attempt to access other users' data, overload or disrupt the service, or upload content you have no right to use.",
          "Automated abuse (for example password guessing or mass sign-ups) is blocked and may lead to suspension.",
        ],
      },
      {
        title: "Your content",
        body: [
          "You own the data you enter and the receipts you upload. You give us permission to store and process them only to provide the service.",
          "You can export or delete your data at any time from Settings.",
        ],
      },
      {
        title: "Availability and liability",
        body: [
          "The service is provided “as is”. We work to keep it available and your data safe, but cannot guarantee uninterrupted operation. Keep your own copies of important records (Settings → Download all data).",
          "To the extent permitted by law, we are not liable for indirect losses or decisions made based on data in the app.",
        ],
      },
      {
        title: "Changes",
        body: ["We may update these terms. Material changes will be shown in the app before they take effect."],
      },
    ],
  },
  id: {
    updated: LEGAL_UPDATED,
    intro: "Dengan menggunakan FinTrack, kamu menyetujui ketentuan ini. Baca juga Kebijakan Privasi.",
    sections: [
      {
        title: "Layanan",
        body: [
          "FinTrack membantumu mencatat dan memahami keuangan pribadi. Ini adalah alat pencatat: tidak memindahkan uang sungguhan, tidak terhubung ke bankmu, dan tidak memberikan nasihat keuangan, pajak, atau hukum.",
          "Pemindaian struk memakai AI dan bisa keliru. Kamu bertanggung jawab memeriksa nominal sebelum menyimpannya.",
        ],
      },
      {
        title: "Akunmu",
        body: [
          "Jaga kerahasiaan kata sandimu dan gunakan kata sandi yang tidak dipakai di tempat lain. Kamu bertanggung jawab atas aktivitas di akunmu.",
          "Sandbox demo bersifat sementara dan dihapus setelah 24 jam.",
        ],
      },
      {
        title: "Penggunaan yang wajar",
        body: [
          "Jangan mencoba mengakses data pengguna lain, membebani atau mengganggu layanan, atau mengunggah konten yang bukan hakmu.",
          "Penyalahgunaan otomatis (misalnya menebak kata sandi atau pendaftaran massal) diblokir dan dapat berujung pada penangguhan.",
        ],
      },
      {
        title: "Kontenmu",
        body: [
          "Kamu pemilik data yang kamu masukkan dan struk yang kamu unggah. Kamu mengizinkan kami menyimpan dan memprosesnya hanya untuk menjalankan layanan.",
          "Kamu dapat mengekspor atau menghapus datamu kapan saja dari halaman Pengaturan.",
        ],
      },
      {
        title: "Ketersediaan dan tanggung jawab",
        body: [
          "Layanan disediakan “apa adanya”. Kami berupaya menjaga layanan tetap tersedia dan datamu aman, tetapi tidak dapat menjamin layanan selalu berjalan tanpa gangguan. Simpan salinan catatan pentingmu (Pengaturan → Unduh semua data).",
          "Sepanjang diizinkan hukum, kami tidak bertanggung jawab atas kerugian tidak langsung atau keputusan yang diambil berdasarkan data di aplikasi.",
        ],
      },
      {
        title: "Perubahan",
        body: ["Kami dapat memperbarui ketentuan ini. Perubahan penting akan ditampilkan di aplikasi sebelum berlaku."],
      },
    ],
  },
};

export const LEGAL = { privacy, terms };
