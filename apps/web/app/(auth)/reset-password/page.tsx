"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PASSWORD_MIN_LENGTH } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/feedback";
import { PasswordInput } from "@/components/auth/password-input";

function ResetForm() {
  const { t } = useLanguage();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) return setError(t.auth.passwordTooShort);
    if (password !== confirm) return setError(t.auth.passwordMismatch);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message || t.common.somethingWrong);
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <InlineAlert>
        {t.auth.resetMissingToken}{" "}
        <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
          {t.auth.forgotSend}
        </Link>
      </InlineAlert>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && <InlineAlert>{error}</InlineAlert>}
      <Field label={t.auth.newPassword}>
        <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.auth.passwordRegisterPlaceholder} autoFocus />
      </Field>
      <Field label={t.auth.confirmPassword}>
        <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t.auth.confirmPasswordPlaceholder} />
      </Field>
      <Button type="submit" size="lg" block loading={loading}>
        {loading ? t.auth.resetSaving : t.auth.resetBtn}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-fg">{t.auth.resetTitle}</h1>
        <p className="mt-2 text-base text-fg-muted">{t.auth.resetSubtitle}</p>
      </div>
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  );
}
