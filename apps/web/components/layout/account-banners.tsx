"use client";

import * as React from "react";
import Link from "next/link";
import { Database, FlaskConical, MailCheck, X } from "lucide-react";
import { toast } from "sonner";
import type { MeResponse } from "@/lib/api/client";
import { endpoints } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";
import { fmt } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const KEY = "fintrack-dismissed-banners";

function useDismissed() {
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  React.useEffect(() => {
    try {
      setDismissed(JSON.parse(sessionStorage.getItem(KEY) || "[]"));
    } catch {
      /* ignore */
    }
  }, []);
  const dismiss = (id: string) =>
    setDismissed((d) => {
      const next = Array.from(new Set([...d, id]));
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  return { dismissed, dismiss };
}

function Banner({
  icon,
  tone,
  title,
  children,
  action,
  onDismiss,
  dismissLabel,
}: {
  icon: React.ReactNode;
  tone: "warning" | "ai" | "brand";
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel: string;
}) {
  const toneClass = {
    warning: "border-warning/35 bg-warning/10",
    ai: "border-ai/30 bg-ai/10",
    brand: "border-brand/25 bg-brand/[0.07]",
  }[tone];
  return (
    <div role="status" className={cn("flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm", toneClass)}>
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-1 text-fg-muted [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{title}</p>
        <p className="text-fg-muted">{children}</p>
      </div>
      {action}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="grid size-8 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Honest status notices: temporary storage, demo sandbox, unverified email. */
export function AccountBanners({ me }: { me: MeResponse }) {
  const { t } = useLanguage();
  const { dismissed, dismiss } = useDismissed();
  const [sending, setSending] = React.useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await endpoints.resendVerification();
      toast.success(t.banners.verifySent);
      dismiss("verify");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const banners: React.ReactNode[] = [];
  if (me.storage === "memory" && !dismissed.includes("memory")) {
    banners.push(
      <Banner key="memory" icon={<Database />} tone="warning" title={t.banners.memoryTitle} onDismiss={() => dismiss("memory")} dismissLabel={t.common.close}>
        {t.banners.memoryDesc}
      </Banner>
    );
  }
  if (me.user.isDemo && !dismissed.includes("demo")) {
    banners.push(
      <Banner
        key="demo"
        icon={<FlaskConical />}
        tone="ai"
        title={t.banners.demoTitle}
        onDismiss={() => dismiss("demo")}
        dismissLabel={t.common.close}
        action={
          <Button asChild size="sm" variant="secondary">
            <Link href="/register">{t.banners.demoCta}</Link>
          </Button>
        }
      >
        {t.banners.demoDesc}
      </Banner>
    );
  }
  if (!me.user.isDemo && me.emailDelivery && me.user.emailVerified === false && !dismissed.includes("verify")) {
    banners.push(
      <Banner
        key="verify"
        icon={<MailCheck />}
        tone="brand"
        title={t.banners.verifyTitle}
        onDismiss={() => dismiss("verify")}
        dismissLabel={t.common.close}
        action={
          <Button size="sm" variant="secondary" onClick={resend} loading={sending}>
            {sending ? t.banners.verifySending : t.banners.verifyResend}
          </Button>
        }
      >
        {fmt(t.banners.verifyDesc, { email: me.user.email })}
      </Banner>
    );
  }
  if (!banners.length) return null;
  return <div className="mb-4 space-y-2 pt-2">{banners}</div>;
}
