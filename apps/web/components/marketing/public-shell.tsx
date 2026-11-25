"use client";

import * as React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/layout/brand-mark";
import { LanguageToggle } from "@/components/auth/auth-shell";

/** Header + footer for public pages (landing, privacy, terms). */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[560px] overflow-hidden">
        <div className="absolute -top-48 left-1/4 h-[460px] w-[680px] rounded-full bg-brand/[0.08] blur-3xl dark:bg-brand/[0.14]" />
        <div className="absolute -top-24 right-0 h-[380px] w-[520px] rounded-full bg-ai/[0.07] blur-3xl dark:bg-ai/[0.1]" />
      </div>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-surface-1 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-elev-3"
      >
        {t.nav.skipToContent}
      </a>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="FinTrack" className="rounded-xl">
          <BrandLockup />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t.landing.signIn}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">{t.landing.getStarted}</Link>
          </Button>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-fg-subtle sm:flex-row sm:px-6">
          <p>{t.footer.copyright}</p>
          <nav className="flex items-center gap-4" aria-label="Legal">
            <Link href="/privacy" className="hover:text-fg">
              {t.landing.privacy}
            </Link>
            <Link href="/terms" className="hover:text-fg">
              {t.landing.terms}
            </Link>
            <span className="sm:hidden">
              <LanguageToggle />
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
