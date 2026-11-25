"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";

function Verify() {
  const { t } = useLanguage();
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"pending" | "done" | "failed">(token ? "pending" : "failed");
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // the token is single-use; never send it twice
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error);
        setState("done");
      })
      .catch((err: Error) => {
        setMessage(err.message);
        setState("failed");
      });
  }, [token]);

  return (
    <div className="space-y-6">
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-line bg-surface-1 p-4 text-sm">
        {state === "pending" && <Loader2 className="size-5 shrink-0 animate-spin text-brand-fg" aria-hidden />}
        {state === "done" && <CheckCircle2 className="size-5 shrink-0 text-positive-fg" aria-hidden />}
        {state === "failed" && <XCircle className="size-5 shrink-0 text-negative-fg" aria-hidden />}
        <p className="text-fg">
          {state === "pending" ? t.system.loading : state === "done" ? t.auth.verifyDone : message || t.auth.verifyFailed}
        </p>
      </div>
      {state !== "pending" && (
        <Button asChild size="lg" block>
          <Link href="/">{t.auth.verifyGoToApp}</Link>
        </Button>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  const { t } = useLanguage();
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-fg">{t.auth.verifyTitle}</h1>
      </div>
      <Suspense>
        <Verify />
      </Suspense>
    </>
  );
}
