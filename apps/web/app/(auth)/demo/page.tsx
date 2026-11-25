"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, HeartPulse, ScanLine, Wallet } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

export default function DemoPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dandy@example.com",
          password: "password123",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || t.demo.demoFailed);
      }

      window.location.href = "/";
    } catch (err) {
      setErrorMsg((err as Error).message);
      setIsLoading(false);
    }
  };

  const highlights = [
    { icon: Wallet, title: t.demo.highlightCards, desc: t.demo.highlightCardsDesc, tint: "bg-brand/15 text-brand-fg" },
    { icon: ScanLine, title: t.demo.highlightScan, desc: t.demo.highlightScanDesc, tint: "bg-ai/15 text-ai-fg" },
    { icon: HeartPulse, title: t.demo.highlightHealth, desc: t.demo.highlightHealthDesc, tint: "bg-positive/15 text-positive-fg" },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6">
        <Link href="/login">
          <ArrowLeft aria-hidden />
          {t.auth.backToLogin}
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-fg">{t.demo.demoTitle}</h1>
        <p className="mt-2 text-base text-fg-muted">{t.demo.demoSubtitle}</p>
      </div>

      {errorMsg && <InlineAlert className="mb-5">{errorMsg}</InlineAlert>}

      <ul className="mb-6 grid grid-cols-3 gap-2.5">
        {highlights.map((h) => (
          <li key={h.title} className="rounded-2xl border border-line bg-surface-1 p-3 text-center shadow-elev-1">
            <span aria-hidden className={cn("mx-auto mb-2 grid size-9 place-items-center rounded-xl", h.tint)}>
              <h.icon className="size-4" />
            </span>
            <p className="text-xs font-semibold text-fg">{h.title}</p>
            <p className="mt-0.5 text-xs text-fg-subtle">{h.desc}</p>
          </li>
        ))}
      </ul>

      <div className="mb-6 rounded-2xl border border-brand/25 bg-brand/[0.06] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{t.demo.sandboxProfile}</span>
          <Badge tone="positive">{t.demo.ready}</Badge>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-fg">Dandy Rahmat Zain</p>
            <p className="text-sm text-fg-subtle">dandy@example.com</p>
          </div>
          <code className="rounded-lg border border-line bg-surface-1 px-2.5 py-1 font-mono text-xs text-fg-muted">password123</code>
        </div>
      </div>

      <Button variant="ai" size="lg" block onClick={handleDemoLogin} loading={isLoading}>
        {isLoading ? t.demo.preparingDemo : t.demo.enterDemoBtn}
        {!isLoading && <ArrowRight aria-hidden />}
      </Button>

      <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-sm sm:flex-row">
        <span className="text-fg-muted">
          {t.demo.hasPersonalAccount}{" "}
          <Link href="/login" className="font-semibold text-brand-fg underline-offset-4 hover:underline">
            {t.auth.signInBtn}
          </Link>
        </span>
        <Link href="/register" className="font-semibold text-brand-fg underline-offset-4 hover:underline">
          {t.demo.registerNewAccount}
        </Link>
      </div>
    </>
  );
}
