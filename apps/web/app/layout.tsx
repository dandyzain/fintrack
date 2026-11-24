import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontSans } from "./fonts";
import { AppProviders } from "@/components/providers/app-providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F7FB" },
    { media: "(prefers-color-scheme: dark)", color: "#070A13" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "FinTrack AI — Personal Finance & Receipt Scanner",
    template: "%s · FinTrack AI",
  },
  description:
    "Smart personal finance and expense tracker with automatic receipt scanning powered by Vision AI.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontSans.variable}>
      <head>
        {/* Restore the saved language before paint (theme is handled by next-themes). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=localStorage.getItem('fintrack-lang');document.documentElement.lang=(l==='id'||l==='en')?l:'en';}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
