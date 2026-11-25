"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { BarChart3 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { usePeriod } from "@/context/period-context";
import { usePrivacy } from "@/context/privacy-context";
import { useReport } from "@/lib/api/queries";
import { fmt, localizeCategoryName } from "@/lib/i18n/translations";
import { formatIDR, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ColorDot } from "@/components/ui/badge";
import { useReportColors } from "./report-colors";

const MonthlyBars = dynamic(() => import("./report-chart").then((m) => m.MonthlyBars), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-2xl sm:h-72" />,
});

type Range = "6" | "12" | "24";

export function ReportsPage() {
  const { t, language } = useLanguage();
  const period = usePeriod();
  const { hidden } = usePrivacy();
  const [range, setRange] = React.useState<Range>("12");
  const report = useReport({ month: period.month, year: period.year }, Number(range));
  const colors = useReportColors();
  const r = report.data;
  const hasData = Boolean(r && (r.totals.income > 0 || r.totals.expense > 0));
  const money = (v: number) => (hidden ? "•••" : formatIDR(v, { lang: language }));
  const monthName = (key: string | null) => {
    if (!key) return "—";
    const [y, m] = key.split("-").map(Number);
    return formatMonth(m, y, language);
  };
  const maxCategory = Math.max(1, ...(r?.categories ?? []).map((c) => c.total));

  const tiles = r
    ? [
        { label: t.reportsPage.income, node: <Money value={r.totals.income} className="text-xl font-bold" /> },
        { label: t.reportsPage.expense, node: <Money value={r.totals.expense} className="text-xl font-bold" /> },
        { label: t.reportsPage.net, node: <Money value={r.totals.net} sign="always" tone={r.totals.net >= 0 ? "positive" : "negative"} className="text-xl font-bold" /> },
        { label: t.reportsPage.savingsRate, node: <span className="tabular text-xl font-bold text-fg">{hidden ? "•••" : `${r.totals.savingsRate}%`}</span> },
        { label: t.reportsPage.avgIncome, node: <Money value={r.totals.averageMonthlyIncome} className="text-base font-semibold" /> },
        { label: t.reportsPage.avgExpense, node: <Money value={r.totals.averageMonthlyExpense} className="text-base font-semibold" /> },
        { label: t.reportsPage.bestMonth, node: <span className="text-base font-semibold text-fg">{monthName(r.totals.bestMonth)}</span> },
        { label: t.reportsPage.worstMonth, node: <span className="text-base font-semibold text-fg">{monthName(r.totals.worstMonth)}</span> },
      ]
    : [];

  return (
    <div className="space-y-5 pb-4 pt-2 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{t.reportsPage.title}</h1>
          <p className="mt-1 text-sm text-fg-subtle sm:text-base">{t.reportsPage.subtitle}</p>
        </div>
        <SegmentedControl
          label={t.reportsPage.title}
          value={range}
          onChange={setRange}
          options={(["6", "12", "24"] as Range[]).map((v) => ({ value: v, label: fmt(t.reportsPage.range, { n: v }) }))}
        />
      </div>

      {report.isPending ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      ) : !r || !hasData ? (
        <EmptyState icon={<BarChart3 />} title={t.reportsPage.empty} />
      ) : (
        <>
          <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", report.isPlaceholderData && "opacity-60")}>
            {tiles.map((tile) => (
              <Card key={tile.label} className="p-4">
                <p className="text-xs font-medium text-fg-subtle">{tile.label}</p>
                <div className="mt-1">{tile.node}</div>
              </Card>
            ))}
          </div>

          <Card as="section" aria-labelledby="monthly-heading" className="p-5 sm:p-6">
            <CardHeader id="monthly-heading" icon={<BarChart3 />} title={t.reportsPage.monthlyTitle} description={t.reportsPage.monthlySubtitle} />
            <ul className="mt-4 flex flex-wrap gap-4 text-sm text-fg-muted" aria-label={t.reportsPage.monthlyTitle}>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: colors.income }} />
                {t.reportsPage.income}
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: colors.expense }} />
                {t.reportsPage.expense}
              </li>
            </ul>
            <div className="mt-3">
              <MonthlyBars data={r.months} />
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-5">
            <Card as="section" aria-labelledby="cat-heading" className="p-5 sm:p-6 lg:col-span-2">
              <CardHeader id="cat-heading" title={t.reportsPage.categoriesTitle} description={t.reportsPage.categoriesSubtitle} />
              <ul className="mt-5 space-y-3.5">
                {r.categories.slice(0, 10).map((c) => (
                  <li key={c.categoryId ?? "none"}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-fg">
                        <ColorDot color={c.categoryColor} className="ring-0" />
                        <span className="truncate">
                          {c.categoryId ? localizeCategoryName(c.categoryName, language) : t.reportsPage.uncategorized}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-fg-muted">
                        {money(c.total)} · {c.percentage}%
                      </span>
                    </div>
                    {/* Magnitude in one hue; the dot carries the category's identity. */}
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, (c.total / maxCategory) * 100)}%`, backgroundColor: colors.income }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card as="section" aria-labelledby="table-heading" className="overflow-hidden p-0 lg:col-span-3">
              <h2 id="table-heading" className="px-5 pb-2 pt-5 text-base font-semibold tracking-tight text-fg sm:px-6">
                {t.reportsPage.tableTitle}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-fg-subtle">
                      <th scope="col" className="px-5 py-2 font-semibold sm:px-6">{t.reportsPage.month}</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">{t.reportsPage.income}</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">{t.reportsPage.expense}</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">{t.reportsPage.net}</th>
                      <th scope="col" className="px-5 py-2 text-right font-semibold sm:px-6">{t.reportsPage.savingsRate}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[...r.months].reverse().map((m) => (
                      <tr key={m.key}>
                        <th scope="row" className="px-5 py-2.5 text-left font-medium text-fg sm:px-6">
                          {formatMonth(m.month, m.year, language)}
                        </th>
                        <td className="tabular px-3 py-2.5 text-right text-fg-muted">{money(m.income)}</td>
                        <td className="tabular px-3 py-2.5 text-right text-fg-muted">{money(m.expense)}</td>
                        <td className={cn("tabular px-3 py-2.5 text-right font-semibold", m.net >= 0 ? "text-positive-fg" : "text-negative-fg")}>
                          {money(m.net)}
                        </td>
                        <td className="tabular px-5 py-2.5 text-right text-fg-muted sm:px-6">{m.income > 0 ? `${m.savingsRate}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

