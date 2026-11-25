"use client";

import * as React from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Loader2, PiggyBank } from "lucide-react";
import type { DailyExpenseTrend, DashboardAnalyticsResponse } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { usePrivacy } from "@/context/privacy-context";
import { fmt } from "@/lib/i18n/translations";
import { percentChange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/feedback";
import { DeltaChip } from "./delta-chip";
import { NetFlowSparkline } from "./net-flow-sparkline";

interface BalanceHeroProps {
  totalBalance: number;
  walletCount: number;
  current?: DashboardAnalyticsResponse;
  previous?: DashboardAnalyticsResponse;
  loading?: boolean;
  /** Daily trends for the viewed month (drives the net-flow sparkline). */
  trends?: DailyExpenseTrend[];
  isCurrentPeriod?: boolean;
  /** True while balances/analytics are refetching. */
  syncing?: boolean;
  /** Changes whenever fresh data lands — replays the "synced" sheen. */
  syncKey?: number;
}

const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

/**
 * Signature moment #1. Load choreography (≈1.6s, CSS so it starts on first paint):
 * digits cascade in → net-flow line draws → stat tiles rise → a light sheen
 * sweeps across once. Ambient: drifting aurora that follows the cursor and
 * settles back as you scroll.
 */
export function BalanceHero({
  totalBalance,
  walletCount,
  current,
  previous,
  loading,
  trends,
  isCurrentPeriod = true,
  syncing = false,
  syncKey = 0,
}: BalanceHeroProps) {
  const { t } = useLanguage();
  const { hidden } = usePrivacy();
  const reduce = useReducedMotion();
  const s = current?.summary;
  const p = previous?.summary;
  const hasPrev = Boolean(p && (p.totalIncome || p.totalExpense));

  // Ambient parallax: aurora leans toward the cursor and eases off on scroll.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const ax = useSpring(useTransform(px, [-0.5, 0.5], [-28, 28]), spring.gentle);
  const ay = useSpring(useTransform(py, [-0.5, 0.5], [-20, 20]), spring.gentle);

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
    if (reduce) return;
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  const stats = [
    {
      key: "income",
      label: t.overview.income,
      icon: ArrowDownLeft,
      iconClass: "bg-positive/15 text-positive-fg",
      value: s?.totalIncome ?? 0,
      change: hasPrev ? percentChange(s?.totalIncome ?? 0, p!.totalIncome) : null,
      goodWhen: "up" as const,
    },
    {
      key: "expense",
      label: t.overview.expense,
      icon: ArrowUpRight,
      iconClass: "bg-negative/15 text-negative-fg",
      value: s?.totalExpense ?? 0,
      change: hasPrev ? percentChange(s?.totalExpense ?? 0, p!.totalExpense) : null,
      goodWhen: "down" as const,
    },
    {
      key: "net",
      label: t.overview.net,
      icon: PiggyBank,
      iconClass: "bg-brand/15 text-brand-fg",
      value: s?.netSavings ?? 0,
      change: hasPrev ? percentChange(s?.netSavings ?? 0, p!.netSavings) : null,
      goodWhen: "up" as const,
    },
  ];

  return (
    <section
      aria-labelledby="balance-heading"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="spotlight relative isolate overflow-hidden rounded-[1.75rem] border border-line bg-surface-1 p-5 shadow-elev-2 sm:p-7"
    >
      {/* Ambient aurora (two counter-drifting layers) with cursor + scroll parallax */}
      <div aria-hidden className="scroll-parallax absolute inset-0 -z-10">
        <motion.div className="absolute inset-0" style={reduce ? undefined : { x: ax, y: ay }}>
          <div className="aurora animate-aurora-drift" />
          <div className="aurora animate-aurora-drift-slow opacity-60 [--aurora-1:6_182_212] [--aurora-2:236_72_153] [--aurora-3:124_58_237]" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-1/30 to-surface-1/90" />
      </div>

      {/* One-time light sweep on load and after every data refresh */}
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-[5] overflow-hidden rounded-[inherit]">
        <span
          key={syncKey}
          className="motion-sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent dark:via-white/10"
          style={d(1500)}
        />
      </span>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] sm:items-start sm:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="balance-heading" className="text-sm font-medium text-fg-muted">
              {t.overview.totalBalance}
            </h2>
            <span
              className="motion-fade inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface-1/70 px-2 py-0.5 text-xs font-medium text-fg-muted backdrop-blur-sm"
              style={d(250)}
              aria-live="polite"
            >
              {syncing ? (
                <>
                  <Loader2 className="size-3 animate-spin text-brand-fg" aria-hidden />
                  {t.overview.syncing}
                </>
              ) : (
                <>
                  <span aria-hidden className="relative flex size-2">
                    <span className="motion-ping absolute inset-0 rounded-full bg-positive" style={d(1800)} />
                    <span className="relative size-2 rounded-full bg-positive" />
                  </span>
                  {t.overview.upToDate}
                </>
              )}
            </span>
          </div>

          {loading ? (
            <Skeleton className="mt-3 h-12 w-64" />
          ) : (
            <p className="mt-1.5 text-display text-fg">
              <Money value={totalBalance} animateOnView revealDelay={80} />
            </p>
          )}
          <p className="motion-fade mt-2 text-sm text-fg-subtle" style={d(520)}>
            {fmt(t.overview.acrossPockets, { count: walletCount })}
          </p>
        </div>

        {!loading && trends && <NetFlowSparkline trends={trends} isCurrent={isCurrentPeriod} delay={350} className="sm:pt-1" />}
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-2 sm:mt-7 sm:grid-cols-3 sm:gap-3">
        {stats.map((st, i) => (
          <div
            key={st.key}
            className={cn(
              "motion-rise group flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-surface-1/70 px-3.5 py-3 backdrop-blur-sm sm:block sm:p-4",
              "transition-[transform,box-shadow,border-color] duration-slow ease-emphasized fine:hover:-translate-y-1 fine:hover:border-line-strong fine:hover:shadow-elev-2"
            )}
            style={d(420 + i * 90)}
          >
            <dt className="flex items-center gap-2 text-xs font-medium text-fg-muted">
              <span aria-hidden className={cn("motion-pop grid size-6 place-items-center rounded-lg", st.iconClass)} style={d(560 + i * 90)}>
                <st.icon className="motion-wiggle size-3.5" />
              </span>
              {st.label}
            </dt>
            <dd className="text-right sm:mt-2 sm:text-left">
              {loading ? (
                <Skeleton className="ml-auto h-6 w-28 sm:ml-0" />
              ) : (
                <Money
                  value={st.value}
                  tone={st.key === "net" && st.value < 0 ? "negative" : "neutral"}
                  className="text-base font-bold tracking-tight sm:text-xl"
                />
              )}
              <div className={cn("mt-1 sm:mt-1.5", hidden && "invisible")}>
                {!loading && <DeltaChip change={st.change} goodWhen={st.goodWhen} />}
              </div>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
