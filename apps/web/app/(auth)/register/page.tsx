"use client";

import { PASSWORD_MIN_LENGTH } from "@fintrack/shared";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/feedback";
import { PasswordInput } from "@/components/auth/password-input";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password strength calculation (unchanged scoring)
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: t.auth.strengthWeak, color: "bg-negative" };
    if (score === 2) return { score: 2, label: t.auth.strengthMedium, color: "bg-warning" };
    if (score === 3) return { score: 3, label: t.auth.strengthStrong, color: "bg-positive" };
    return { score: 4, label: t.auth.strengthVeryStrong, color: "bg-ai" };
  };

  const strength = getPasswordStrength(password);
  const matches = confirmPassword.length > 0 && password === confirmPassword;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      setErrorMsg(t.auth.allFieldsRequired);
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setErrorMsg(t.auth.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(t.auth.passwordMismatch);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || t.auth.registerFailed);
      }

      // Automatically redirect to dashboard
      window.location.href = "/";
    } catch (err) {
      setErrorMsg((err as Error).message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-fg">{t.auth.registerHeading}</h1>
        <p className="mt-2 text-base text-fg-muted">{t.auth.registerTitle}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errorMsg && <InlineAlert>{errorMsg}</InlineAlert>}

        <Field label={t.auth.fullName}>
          <Input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.auth.fullNamePlaceholder}
            required
            autoFocus
          />
        </Field>

        <Field label={t.auth.email}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.auth.emailPlaceholder}
            required
          />
        </Field>

        <Field label={t.auth.password} hint={t.auth.passwordRegisterPlaceholder}>
          <PasswordInput
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.passwordRegisterPlaceholder}
            minLength={6}
            required
          />
        </Field>

        {password && (
          <div aria-live="polite">
            <div className="flex items-center justify-between text-xs">
              <span className="text-fg-subtle">{t.auth.passwordStrength}</span>
              <span className="font-semibold text-fg">{strength.label}</span>
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <motion.div
                    className={cn("h-full rounded-full", strength.color)}
                    initial={false}
                    animate={{ width: i <= strength.score ? "100%" : "0%" }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <Field
          label={t.auth.confirmPassword}
          error={mismatch ? t.auth.passwordMismatch : undefined}
          badge={
            matches ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-positive-fg">
                <Check className="size-3.5" aria-hidden />
                {t.auth.passwordsMatch}
              </span>
            ) : null
          }
        >
          <PasswordInput
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t.auth.confirmPasswordPlaceholder}
            required
          />
        </Field>

        <Button type="submit" size="lg" block loading={isLoading}>
          {isLoading ? t.auth.creatingAccount : t.auth.registerBtn}
          {!isLoading && <ArrowRight aria-hidden />}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-fg-muted">
        {t.auth.hasAccount}{" "}
        <Link href="/login" className="font-semibold text-brand-fg underline-offset-4 hover:underline">
          {t.auth.loginHere}
        </Link>
      </p>
    </>
  );
}
