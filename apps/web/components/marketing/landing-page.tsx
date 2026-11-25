"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Download, KeyRound, Lock, Repeat, ScanLine, ShieldCheck, Sparkles, Target, Wallet } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/feedback";
import { CardStack } from "@/components/auth/auth-shell";
import { PublicShell } from "./public-shell";

function DemoButton({ size = "lg" }: { size?: "lg" | "md" }) {
  const { t } = useLanguage();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || t.demo.demoFailed);
      window.location.href = "/";
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };
  return (
    <div className="space-y-2">
      <Button variant="ai" size={size} onClick={start} loading={loading}>
        {!loading && <Sparkles aria-hidden />}
        {loading ? t.demo.preparingDemo : t.landing.ctaDemo}
      </Button>
      {error && <InlineAlert className="max-w-sm">{error}</InlineAlert>}
    </div>
  );
}

export function LandingPage() {
  const { t } = useLanguage();
  const features = [
    { icon: ScanLine, title: t.landing.f1Title, desc: t.landing.f1Desc, tint: "bg-ai/15 text-ai-fg" },
    { icon: Wallet, title: t.landing.f2Title, desc: t.landing.f2Desc, tint: "bg-brand/15 text-brand-fg" },
    { icon: Target, title: t.landing.f3Title, desc: t.landing.f3Desc, tint: "bg-warning/15 text-warning-fg" },
    { icon: Repeat, title: t.landing.f4Title, desc: t.landing.f4Desc, tint: "bg-positive/15 text-positive-fg" },
    { icon: BarChart3, title: t.landing.f5Title, desc: t.landing.f5Desc, tint: "bg-brand/15 text-brand-fg" },
    { icon: Download, title: t.landing.f6Title, desc: t.landing.f6Desc, tint: "bg-surface-3 text-fg-muted" },
  ];
  const security = [
    { icon: Lock, text: t.landing.s1 },
    { icon: KeyRound, text: t.landing.s2 },
    { icon: ShieldCheck, text: t.landing.s3 },
  ];

  return (
    <PublicShell>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-2 lg:pt-16">
        <div>
          <Badge tone="ai" className="mb-5">
            <Sparkles aria-hidden />
            {t.landing.heroBadge}
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-fg sm:text-5xl">{t.landing.heroTitle}</h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-fg-muted">{t.landing.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap items-start gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                {t.landing.ctaPrimary}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <DemoButton />
          </div>
          <p className="mt-3 text-sm text-fg-subtle">{t.landing.ctaDemoHint}</p>
        </div>
        <div className="hidden justify-center lg:flex">
          <CardStack />
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 id="features-heading" className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {t.landing.featuresTitle}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.title}>
              <Card className="h-full p-5">
                <span aria-hidden className={`grid size-10 place-items-center rounded-xl ${f.tint}`}>
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-fg">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.desc}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="security-heading" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Card className="p-6 sm:p-8">
          <h2 id="security-heading" className="text-xl font-bold tracking-tight text-fg">
            {t.landing.securityTitle}
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {security.map((s) => (
              <li key={s.text} className="flex items-start gap-3 text-sm text-fg-muted">
                <s.icon className="mt-0.5 size-5 shrink-0 text-positive-fg" aria-hidden />
                {s.text}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 text-center sm:px-6">
        <h2 className="text-balance text-2xl font-bold tracking-tight text-fg sm:text-3xl">{t.landing.finalTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-fg-muted">{t.landing.finalSubtitle}</p>
        <div className="mt-7 flex flex-wrap items-start justify-center gap-3">
          <DemoButton />
          <Button asChild size="lg" variant="outline">
            <Link href="/register">{t.landing.ctaPrimary}</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
