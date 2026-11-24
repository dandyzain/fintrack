"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Target } from "lucide-react";
import type { CategoryBudgetComparison } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { usePeriod } from "@/context/period-context";
import { usePrivacy } from "@/context/privacy-context";
import { fmt, localizeCategoryName } from "@/lib/i18n/translations";
import { formatIDR, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";

export function BudgetsCard({ items, loading }: { items?: CategoryBudgetComparison[]; loading?: boolean }) {
  const { t, language } = useLanguage();
  const { month, year } = usePeriod();
  const { hidden } = usePrivacy();
  const reduce = useReducedMotion();

  return (
    <Card as="section" aria-labelledby="budgets-heading" className="h-full p-5 sm:p-6">
      <CardHeader
        id="budgets-heading"
        icon={<Target />}
        title={t.overview.budgets.title}
        description={fmt(t.overview.budgets.subtitle, { month: formatMonth(month, year, language) })}
      />
      <div className="mt-5">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !items?.length ? (
          <EmptyState compact icon={<Target />} title={t.overview.budgets.empty} />
        ) : (
          <ul className="space-y-4">
            {items.map((b) => {
              const pct = Math.min(100, Math.round(b.percentageUsed));
              const status = b.isOverBudget ? "over" : pct > 80 ? "warning" : "safe";
              return (
                <li key={b.categoryId}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.categoryColor }} aria-hidden />
                      <span className="truncate">{localizeCategoryName(b.categoryName, language)}</span>
                    </span>
                    <Badge tone={status === "over" ? "negative" : status === "warning" ? "warning" : "positive"}>
                      {status === "over"
                        ? t.overview.budgets.statusOver
                        : status === "warning"
                        ? t.overview.budgets.statusWarning
                        : t.overview.budgets.statusSafe}
                    </Badge>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    aria-label={localizeCategoryName(b.categoryName, language)}
                  >
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        status === "over" ? "bg-negative" : status === "warning" ? "bg-warning" : "bg-positive"
                      )}
                      initial={{ width: reduce ? `${pct}%` : 0 }}
                      whileInView={{ width: `${Math.max(pct, 2)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="text-fg-subtle">
                      <Money value={b.actualExpense} className="font-semibold text-fg" />{" "}
                      {fmt(t.overview.budgets.ofLimit, {
                        amount: hidden ? "•••" : formatIDR(b.limitAmount, { lang: language }),
                      })}
                    </span>
                    <span className={cn("tabular font-medium", status === "over" ? "text-negative-fg" : "text-fg-muted")}>
                      {hidden
                        ? "•••"
                        : status === "over"
                        ? fmt(t.overview.budgets.over, { amount: formatIDR(b.actualExpense - b.limitAmount, { lang: language }) })
                        : fmt(t.overview.budgets.left, { amount: formatIDR(b.remainingBudget, { lang: language }) })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
