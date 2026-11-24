"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HeartPulse, Sparkles } from "lucide-react";
import type { DashboardAnalyticsResponse } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { getLocalizedHealthAdvisory } from "@/lib/i18n/translations";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/feedback";

type Tone = "positive" | "brand" | "warning" | "negative";

function toneFor(score: number): { tone: Tone; stops: [string, string] } {
  if (score >= 90) return { tone: "positive", stops: ["#10B981", "#22D3EE"] };
  if (score >= 75) return { tone: "brand", stops: ["#8B5CF6", "#22D3EE"] };
  if (score >= 50) return { tone: "warning", stops: ["#F59E0B", "#F97316"] };
  return { tone: "negative", stops: ["#F43F5E", "#E11D48"] };
}

const R = 52;
const C = 2 * Math.PI * R;

/** Single source of the health score (it used to appear three times). */
export function HealthCard({ analytics, loading }: { analytics?: DashboardAnalyticsResponse; loading?: boolean }) {
  const { t, language } = useLanguage();
  const reduce = useReducedMotion();
  const s = analytics?.summary;
  const hasData = Boolean(s && (s.totalIncome > 0 || s.totalExpense > 0));
  const score = analytics?.financialHealth?.score ?? 0;
  const savings = analytics?.metrics?.savingsRatio ?? 0;
  const spendRatio = analytics?.metrics?.expenseToIncomeRatio ?? 0;
  const advisory = getLocalizedHealthAdvisory(score, savings, spendRatio, language);
  const { tone, stops } = toneFor(score);
  const badge =
    score >= 90
      ? t.overview.health.badgeOptimal
      : score >= 75
      ? t.overview.health.badgeHealthy
      : score >= 50
      ? t.overview.health.badgeWarning
      : t.overview.health.badgeCritical;

  return (
    <section aria-labelledby="health-heading" className="panel flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 id="health-heading" className="flex items-center gap-2 text-sm font-medium text-fg-muted">
          <HeartPulse className="size-4 text-brand-fg" aria-hidden />
          {t.overview.health.title}
        </h2>
        {hasData && !loading && <Badge tone={tone === "brand" ? "brand" : tone}>{badge}</Badge>}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center gap-5 py-4">
          <Skeleton className="size-32 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ) : !hasData ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand-fg" aria-hidden>
            <Sparkles className="size-5" />
          </span>
          <p className="max-w-[16rem] text-sm text-fg-subtle">{t.overview.health.noData}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center gap-4 py-4 sm:flex-row lg:flex-col xl:flex-row">
            <div
              className="relative size-32 shrink-0"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={score}
              aria-label={t.overview.health.title}
            >
              <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
                <defs>
                  <linearGradient id="health-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={stops[0]} />
                    <stop offset="100%" stopColor={stops[1]} />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgb(var(--surface-3))" strokeWidth="10" />
                <motion.circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke="url(#health-grad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  initial={{ strokeDashoffset: reduce ? C * (1 - score / 100) : C }}
                  animate={{ strokeDashoffset: C * (1 - score / 100) }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="tabular text-3xl font-bold tracking-tight text-fg">{score}</p>
                  <p className="text-xs text-fg-subtle">{t.overview.health.outOf}</p>
                </div>
              </div>
            </div>
            <div className="min-w-0 text-center sm:text-left lg:text-center xl:text-left">
              <p className="text-base font-semibold text-fg">{advisory.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">{advisory.message}</p>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">{t.overview.health.savingsRate}</span>
              <span className="tabular font-semibold text-fg">{formatPercent(savings, language)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              <motion.div
                className={cn("h-full rounded-full bg-gradient-to-r from-brand to-ai")}
                initial={{ width: reduce ? `${Math.min(100, savings)}%` : 0 }}
                animate={{ width: `${Math.min(100, savings)}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
