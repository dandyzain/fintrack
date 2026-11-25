"use client";

import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./brand-mark";

/** Full-page message used by 404 and error boundaries. */
export function StatusPage({ code, title, description, onRetry }: { code?: string; title: string; description: string; onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="max-w-md text-center">
        <BrandMark size={40} className="mx-auto" />
        {code && <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-brand-fg">{code}</p>}
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-fg">{title}</h1>
        <p className="mt-3 text-base text-fg-muted">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onRetry && <Button onClick={onRetry}>{t.system.retry}</Button>}
          <Button asChild variant={onRetry ? "outline" : "primary"}>
            <Link href="/">{t.system.goHome}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
