"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/feedback";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError(t.auth.emailPasswordRequired);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setSent(true);
    } catch (err) {
      setError((err as Error).message || t.common.somethingWrong);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6">
        <Link href="/login">
          <ArrowLeft aria-hidden />
          {t.auth.backToLogin}
        </Link>
      </Button>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-fg">{t.auth.forgotTitle}</h1>
        <p className="mt-2 text-base text-fg-muted">{t.auth.forgotSubtitle}</p>
      </div>
      {sent ? (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-positive/30 bg-positive/10 p-4 text-sm text-fg">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-positive-fg" aria-hidden />
          <p>{t.auth.forgotSent}</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {error && <InlineAlert>{error}</InlineAlert>}
          <Field label={t.auth.email}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.emailPlaceholder}
              autoFocus
              required
            />
          </Field>
          <Button type="submit" size="lg" block loading={loading}>
            {loading ? t.auth.forgotSending : t.auth.forgotSend}
          </Button>
        </form>
      )}
    </>
  );
}
