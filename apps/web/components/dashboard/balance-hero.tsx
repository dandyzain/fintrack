"use client";

import { ArrowDownLeft, ArrowUpRight, PiggyBank } from "lucide-react";
import type { DashboardAnalyticsResponse } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { usePrivacy } from "@/context/privacy-context";
import { fmt } from "@/lib/i18n/translations";
import { percentChange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/feedback";
import { DeltaChip } from "./delta-chip";

interface BalanceHeroProps {
  totalBalance: number;
  walletCount: number;
  current?: DashboardAnalyticsResponse;
  previous?: DashboardAnalyticsResponse;
  loading?: boolean;
}

/** Signature moment #1: the balance floats over a slow aurora. */
export function BalanceHero({ totalBalance, walletCount, current, previous, loading }: BalanceHeroProps) {
  const { t } = useLanguage();
  const { hidden } = usePrivacy();
  const s = current?.summary;
  const p = previous?.summary;
  const hasPrev = Boolean(p && (p.totalIncome || p.totalExpense));

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
      className="relative isolate overflow-hidden rounded-[1.75rem] border border-line bg-surface-1 p-5 shadow-elev-2 sm:p-7"
    >
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div className="aurora animate-aurora-drift" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-1/30 to-surface-1/90" />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="balance-heading" className="text-sm font-medium text-fg-muted">
            {t.overview.totalBalance}
          </h2>
          {loading ? (
            <Skeleton className="mt-3 h-12 w-64" />
          ) : (
            <p className="mt-1.5 text-display text-fg">
              <Money value={totalBalance} animateOnView />
            </p>
          )}
          <p className="mt-2 text-sm text-fg-subtle">{fmt(t.overview.acrossPockets, { count: walletCount })}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-2 sm:mt-7 sm:grid-cols-3 sm:gap-3">
        {stats.map((st) => (
          <div
            key={st.key}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-surface-1/70 px-3.5 py-3 backdrop-blur-sm sm:block sm:p-4"
          >
            <dt className="flex items-center gap-2 text-xs font-medium text-fg-muted">
              <span aria-hidden className={cn("grid size-6 place-items-center rounded-lg", st.iconClass)}>
                <st.icon className="size-3.5" />
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
