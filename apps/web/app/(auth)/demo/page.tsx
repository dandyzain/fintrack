"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, HeartPulse, ScanLine, Wallet } from "lucide-react";
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
      // Each visitor gets a fresh, private sandbox (no shared credentials).
      const res = await fetch("/api/auth/demo", { method: "POST" });

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
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{t.demo.privateSandbox}</span>
          <Badge tone="positive">{t.demo.ready}</Badge>
        </div>
        <p className="text-sm text-fg">{t.demo.privateSandboxDesc}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-subtle">
          <Clock className="size-3.5" aria-hidden />
          {t.demo.expiresNote}
        </p>
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
