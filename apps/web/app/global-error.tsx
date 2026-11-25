"use client";

/**
 * Last-resort boundary (the root layout itself failed), so it renders its own
 * <html> and can't rely on providers, fonts or translations.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F6F7FB", color: "#0F172A" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Terjadi kesalahan · Something went wrong</h1>
            <p style={{ color: "#475569", margin: "0 0 24px" }}>
              Data Anda aman. Muat ulang halaman untuk mencoba lagi. · Your data is safe. Reload to try again.
            </p>
            <button
              onClick={reset}
              style={{ background: "#7C3AED", color: "#fff", border: 0, borderRadius: 12, padding: "12px 20px", fontWeight: 600, cursor: "pointer" }}
            >
              Coba lagi · Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
