import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/language-context";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "FinTrack AI - Personal Finance & OCR Receipt Scanner",
  description:
    "Smart Personal Finance & Expense Tracker with automatic receipt OCR scanning powered by Vision AI.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('fintrack-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }

                var lang = localStorage.getItem('fintrack-lang');
                if (lang === 'id' || lang === 'en') {
                  document.documentElement.lang = lang;
                } else {
                  document.documentElement.lang = 'en';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-[#F8FAFC] text-slate-900 dark:bg-[#090D16] dark:text-slate-100 antialiased min-h-screen">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
