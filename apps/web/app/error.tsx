"use client";

import { useEffect } from "react";
import { useLanguage } from "@/context/language-context";
import { StatusPage } from "@/components/layout/status-page";

/** Error boundary for every route: friendly message + retry instead of a blank page. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();
  useEffect(() => {
    console.error("[fintrack] page error", error.digest ?? "", error.message);
  }, [error]);
  return <StatusPage title={t.system.errorTitle} description={t.system.errorDesc} onRetry={reset} />;
}
