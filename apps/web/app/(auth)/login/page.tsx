"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/feedback";
import { PasswordInput } from "@/components/auth/password-input";

/** Only same-site paths are accepted as `?next=` (no open redirect). */
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export default function LoginPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMsg(t.auth.emailPasswordRequired);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || t.auth.loginFailed);
      }

      window.location.href = safeNext();
    } catch (err) {
      setErrorMsg((err as Error).message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-fg">{t.auth.welcomeBack}</h1>
        <p className="mt-2 text-base text-fg-muted">{t.auth.loginTitle}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errorMsg && <InlineAlert>{errorMsg}</InlineAlert>}

        <Field label={t.auth.email}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.auth.emailPlaceholder}
            required
            autoFocus
          />
        </Field>

        <Field
          label={t.auth.password}
          badge={
            <Link href="/forgot-password" className="text-xs font-semibold text-brand-fg underline-offset-4 hover:underline">
              {t.auth.forgotLink}
            </Link>
          }
        >
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.passwordPlaceholder}
            required
          />
        </Field>

        <Button type="submit" size="lg" block loading={isLoading}>
          {isLoading ? t.auth.verifying : t.auth.signInBtn}
          {!isLoading && <ArrowRight aria-hidden />}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-surface-1 p-4 shadow-elev-1">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-ai/15 text-ai-fg">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{t.auth.demoModeTitle}</p>
          <p className="text-sm text-fg-subtle">{t.auth.demoModeDesc}</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/demo">{t.auth.openDemo}</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-fg-muted">
        {t.auth.noAccount}{" "}
        <Link href="/register" className="font-semibold text-brand-fg underline-offset-4 hover:underline">
          {t.auth.registerNow}
        </Link>
      </p>

      <footer className="mt-10 space-y-1 text-center text-xs text-fg-subtle">
        <p>{t.footer.copyright}</p>
        <p>
          {t.footer.createdByPrefix} <span className="font-semibold text-fg-muted">{t.footer.authorName}</span>
        </p>
      </footer>
    </>
  );
}
