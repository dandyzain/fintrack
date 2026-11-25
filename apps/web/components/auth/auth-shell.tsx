"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HeartPulse, Moon, ScanLine, Sun, Wallet } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useThemeSwitch } from "@/lib/hooks/use-theme-switch";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { BrandLockup, BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  const { t } = useLanguage();
  const { resolvedTheme, switchTheme } = useThemeSwitch();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        switchTheme(dark ? "light" : "dark", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      aria-label={dark ? t.nav.themeLight : t.nav.themeDark}
      className="grid size-10 place-items-center rounded-xl border border-line bg-surface-1 text-fg-muted shadow-elev-1 transition hover:text-fg active:scale-95 coarse:size-11"
    >
      <motion.span key={dark ? "sun" : "moon"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
        {dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
      </motion.span>
    </button>
  );
}

function LanguageToggle() {
  const { t, language, setLanguage } = useLanguage();
  return (
    <SegmentedControl
      size="sm"
      label={t.nav.language}
      value={language}
      onChange={(v) => setLanguage(v)}
      options={[
        { value: "en", label: "EN" },
        { value: "id", label: "ID" },
      ]}
    />
  );
}

/** Floating stack of pocket cards for the brand panel. */
function CardStack() {
  const reduce = useReducedMotion();
  const cards = [
    { g: "from-[#5B21B6] via-[#6D28D9] to-[#1E1B4B]", label: "BCA", amount: "Rp 5.000.000", rot: -8, x: -36, y: 24 },
    { g: "from-[#0E7490] via-[#155E75] to-[#1E3A8A]", label: "GoPay", amount: "Rp 450.000", rot: 4, x: 28, y: -8 },
    { g: "from-[#047857] via-[#065F46] to-[#0B2530]", label: "Cash", amount: "Rp 350.000", rot: -2, x: 0, y: -40 },
  ];
  return (
    <div aria-hidden className="relative mx-auto h-56 w-72">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          className={cn("absolute inset-x-0 mx-auto h-40 w-64 rounded-3xl bg-gradient-to-br p-5 text-white shadow-elev-3 ring-1 ring-inset ring-white/15", c.g)}
          initial={{ opacity: 0, y: 40, rotate: 0 }}
          animate={
            reduce
              ? { opacity: 1, y: c.y, x: c.x, rotate: c.rot }
              : { opacity: 1, y: [c.y, c.y - 8, c.y], x: c.x, rotate: c.rot }
          }
          transition={{
            opacity: { delay: 0.2 + i * 0.12, duration: 0.6 },
            x: { delay: 0.2 + i * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] },
            rotate: { delay: 0.2 + i * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] },
            y: reduce
              ? { delay: 0.2 + i * 0.12, duration: 0.8 }
              : { delay: 1 + i * 0.4, duration: 5 + i, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{ zIndex: i }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{c.label}</span>
            <span className="h-6 w-8 rounded-[5px] bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500" />
          </div>
          <p className="tabular mt-10 text-2xl font-bold tracking-tight">{c.amount}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const features = [
    { icon: ScanLine, title: t.auth.featureScan, desc: t.auth.featureScanDesc, tint: "text-ai-fg bg-ai/15" },
    { icon: Wallet, title: t.auth.featurePockets, desc: t.auth.featurePocketsDesc, tint: "text-brand-fg bg-brand/15" },
    { icon: HeartPulse, title: t.auth.featureHealth, desc: t.auth.featureHealthDesc, tint: "text-positive-fg bg-positive/15" },
  ];

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel (desktop) */}
      <aside className="grain relative isolate hidden overflow-hidden border-r border-line bg-surface-1 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="aurora animate-aurora-drift" />
          <div className="aurora animate-aurora-drift-slow opacity-60 [--aurora-1:6_182_212] [--aurora-2:124_58_237]" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/40 to-transparent" />
        </div>
        <BrandLockup tagline={t.brand.tagline} />
        <div className="space-y-10">
          <CardStack />
          <div className="max-w-md space-y-4">
            <h2 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-fg xl:text-5xl">{t.auth.heroTitle}</h2>
            <p className="text-base leading-relaxed text-fg-muted">{t.auth.heroSubtitle}</p>
          </div>
          <ul className="grid gap-4 xl:grid-cols-3">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-3 xl:flex-col">
                <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-xl", f.tint)}>
                  <f.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-fg">{f.title}</span>
                  <span className="block text-sm text-fg-subtle">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form side */}
      <div className="relative flex min-h-dvh flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden lg:hidden">
          <div className="absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
        </div>
        <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
          <span className="lg:invisible">
            <BrandMark size={36} />
          </span>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="enter-rise w-full max-w-[26rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
