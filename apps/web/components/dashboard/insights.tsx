"use client";

import { CalendarDays, Coins, Lightbulb, ScanLine, TrendingDown } from "lucide-react";
import type { DashboardAnalyticsResponse } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { fmt, localizeCategoryName, type TranslationSchema } from "@/lib/i18n/translations";
import { formatIDR, formatPercent, percentChange } from "@/lib/format";
import type { Language } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { Money } from "@/components/ui/money";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { usePrivacy } from "@/context/privacy-context";

/** Plain-language observation comparing category spending with last month. */
export function buildInsight(
  current: DashboardAnalyticsResponse | undefined,
  previous: DashboardAnalyticsResponse | undefined,
  t: TranslationSchema,
  lang: Language
): string | null {
  const cur = current?.categoryBreakdown ?? [];
  if (!cur.length) return null;
  const prevMap = new Map((previous?.categoryBreakdown ?? []).map((c) => [c.categoryId, c.totalAmount]));
  let best: { name: string; change: number | null } | null = null;
  for (const c of cur) {
    const prev = prevMap.get(c.categoryId) ?? 0;
    const change = percentChange(c.totalAmount, prev);
    if (change === null) {
      if (!best) best = { name: c.categoryName, change: null };
      continue;
    }
    if (!best || best.change === null || Math.abs(change) > Math.abs(best.change)) {
      best = { name: c.categoryName, change };
    }
  }
  if (!best) return null;
  const category = localizeCategoryName(best.name, lang);
  if (best.change === null) {
    return previous?.categoryBreakdown?.length ? fmt(t.overview.insights.newCategory, { category }) : null;
  }
  if (Math.abs(best.change) < 5) return t.overview.insights.steady;
  const pct = formatPercent(Math.abs(best.change), lang);
  return fmt(best.change < 0 ? t.overview.insights.lower : t.overview.insights.higher, { category, pct });
}

export function InsightsRow({
  analytics,
  previous,
  loading,
}: {
  analytics?: DashboardAnalyticsResponse;
  previous?: DashboardAnalyticsResponse;
  loading?: boolean;
}) {
  const { t, language } = useLanguage();
  const { hidden } = usePrivacy();
  const m = analytics?.metrics;
  const s = analytics?.summary;
  const insight = buildInsight(analytics, previous, t, language);

  const tiles = [
    {
      key: "daily",
      icon: CalendarDays,
      tint: "text-brand-fg bg-brand/10",
      label: t.overview.insights.dailyAvg,
      value: <Money value={m?.dailyAverageExpense ?? 0} />,
      sub: fmt(t.overview.insights.projected, {
        amount: hidden ? "•••" : formatIDR(m?.projectedMonthEndExpense ?? 0, { compact: true, lang: language }),
      }),
    },
    {
      key: "avg",
      icon: Coins,
      tint: "text-warning-fg bg-warning/10",
      label: t.overview.insights.avgPerTx,
      value: <Money value={m?.averageTransactionAmount ?? 0} />,
      sub: fmt(t.overview.insights.fromCount, { count: s?.expenseCount ?? 0 }),
    },
    {
      key: "largest",
      icon: TrendingDown,
      tint: "text-negative-fg bg-negative/10",
      label: t.overview.insights.largest,
      value: m?.largestExpense ? <Money value={m.largestExpense.amount} /> : <span className="text-fg-subtle">—</span>,
      sub: m?.largestExpense?.merchantName
        ? localizeCategoryName(m.largestExpense.merchantName, language)
        : t.overview.insights.none,
    },
    {
      key: "receipts",
      icon: ScanLine,
      tint: "text-ai-fg bg-ai/10",
      label: t.overview.insights.receipts,
      value: <span className="tabular">{fmt(t.overview.insights.receiptsCount, { count: m?.receiptScanCount ?? 0 })}</span>,
      sub: fmt(t.overview.insights.receiptsTotal, {
        amount: hidden ? "•••" : formatIDR(m?.receiptScanTotalAmount ?? 0, { compact: true, lang: language }),
      }),
    },
  ];

  return (
    <section aria-labelledby="insights-heading" className="space-y-4">
      <h2 id="insights-heading" className="text-base font-semibold tracking-tight text-fg">
        {t.overview.insights.title}
      </h2>

      {insight && !loading && (
        <p className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand/[0.06] px-4 py-3 text-sm text-fg">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-fg" aria-hidden />
          <span>{insight}</span>
        </p>
      )}

      <ul
        tabIndex={0}
        aria-labelledby="insights-heading"
        className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.key} className="w-[72%] shrink-0 snap-start min-[480px]:w-[46%] sm:w-auto">
            <Card spotlight className="h-full p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <span aria-hidden className={cn("grid size-8 place-items-center rounded-lg", tile.tint)}>
                  <tile.icon className="size-4" />
                </span>
                <p className="text-sm font-medium text-fg-muted">{tile.label}</p>
              </div>
              {loading ? (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              ) : (
                <>
                  <p className="mt-3 truncate text-xl font-bold tracking-tight text-fg">{tile.value}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">{tile.sub}</p>
                </>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
