"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { fmt } from "@/lib/i18n/translations";
import { LEGAL } from "@/lib/i18n/legal";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PublicShell } from "./public-shell";

export function LegalPage({ doc }: { doc: keyof typeof LEGAL }) {
  const { t, language } = useLanguage();
  const content = LEGAL[doc][language];
  const title = doc === "privacy" ? t.legal.privacyTitle : t.legal.termsTitle;
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6">
          <Link href="/">
            <ArrowLeft aria-hidden />
            {t.legal.back}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-fg-subtle">{fmt(t.legal.updated, { date: formatDate(`${content.updated}T12:00:00Z`, language, "long") })}</p>
        <p className="mt-6 text-base leading-relaxed text-fg-muted">{content.intro}</p>
        {content.sections.map((s) => (
          <section key={s.title} className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight text-fg">{s.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg-muted marker:text-fg-subtle">
              {s.body.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </PublicShell>
  );
}
