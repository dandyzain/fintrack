"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/language-context";
import { usePeriod } from "@/context/period-context";
import { usePrivacy } from "@/context/privacy-context";
import { useAnalytics, useBudgets, useCategories, useCopyBudgets, useDeleteBudget, useUpsertBudget } from "@/lib/api/queries";
import type { Budget, Category } from "@/lib/api/client";
import { fmt, localizeCategoryName } from "@/lib/i18n/translations";
import { formatIDR, formatMonth } from "@/lib/format";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AmountInput } from "@/components/ui/amount-input";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { Tooltip } from "@/components/ui/tooltip";
import { CategoryBubble } from "@/components/transactions/category-icon";

/** Categories that are about money coming in don't get a spending cap. */
const INCOME_CATEGORIES = new Set(["Gaji & Pendapatan", "Salary & Income"]);

export function BudgetsPage() {
  const { t, language } = useLanguage();
  const period = usePeriod();
  const mounted = useMounted();
  const categories = useCategories();
  const budgets = useBudgets(period);
  const analytics = useAnalytics(period);
  const copy = useCopyBudgets();

  const spentBy = React.useMemo(
    () => new Map((analytics.data?.categoryBreakdown ?? []).map((c) => [c.categoryId, c.totalAmount])),
    [analytics.data]
  );
  const budgetBy = React.useMemo(() => new Map((budgets.data ?? []).map((b) => [b.categoryId, b])), [budgets.data]);

  const rows = React.useMemo(() => {
    const list = (categories.data ?? []).filter((c) => !INCOME_CATEGORIES.has(c.name));
    return list
      .map((c) => {
        const budget = budgetBy.get(c.id) ?? null;
        const spent = spentBy.get(c.id) ?? 0;
        return { category: c, budget, spent, pct: budget ? (spent / budget.limitAmount) * 100 : 0 };
      })
      .sort((a, b) => Number(Boolean(b.budget)) - Number(Boolean(a.budget)) || b.pct - a.pct || b.spent - a.spent);
  }, [categories.data, budgetBy, spentBy]);

  const totals = rows.reduce(
    (acc, r) => (r.budget ? { limit: acc.limit + r.budget.limitAmount, spent: acc.spent + r.spent } : acc),
    { limit: 0, spent: 0 }
  );
  const prevLabel = mounted ? formatMonth(period.previous.month, period.previous.year, language, "short") : "";
  const loading = categories.isPending || budgets.isPending;

  const copyPrev = async () => {
    try {
      const { copied } = await copy.mutateAsync({ from: period.previous, to: { month: period.month, year: period.year } });
      if (copied) toast.success(fmt(t.budgetsPage.copied, { count: copied }));
      else toast(fmt(t.budgetsPage.copyNone, { month: prevLabel }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-5 pb-4 pt-2 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{t.budgetsPage.title}</h1>
          <p className="mt-1 text-sm text-fg-subtle sm:text-base">
            {t.budgetsPage.subtitle}
            {mounted && ` · ${formatMonth(period.month, period.year, language)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyPrev} loading={copy.isPending}>
            {!copy.isPending && <Copy aria-hidden />}
            {fmt(t.budgetsPage.copyPrev, { month: prevLabel })}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/settings#categories">{t.budgetsPage.manageCategories}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t.budgetsPage.totalBudget, value: totals.limit },
          { label: t.budgetsPage.totalSpent, value: totals.spent },
          { label: t.budgetsPage.totalRemaining, value: totals.limit - totals.spent, tone: totals.limit - totals.spent < 0 ? "negative" : "neutral" },
        ].map((tile) => (
          <Card key={tile.label} className="p-4">
            <p className="text-sm text-fg-subtle">{tile.label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-32" />
            ) : (
              <Money value={tile.value} tone={tile.tone === "negative" ? "negative" : "neutral"} className="mt-1 block text-2xl font-bold tracking-tight" />
            )}
          </Card>
        ))}
      </div>

      <Card className="p-2 sm:p-3">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState className="m-2" icon={<Target />} title={t.budgetsPage.empty} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <BudgetRow key={r.category.id} category={r.category} budget={r.budget} spent={r.spent} period={period} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function BudgetRow({
  category,
  budget,
  spent,
  period,
}: {
  category: Category;
  budget: Budget | null;
  spent: number;
  period: { month: number; year: number };
}) {
  const { t, language } = useLanguage();
  const { hidden } = usePrivacy();
  const upsert = useUpsertBudget();
  const remove = useDeleteBudget();
  const [limit, setLimit] = React.useState(budget?.limitAmount ?? 0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setLimit(budget?.limitAmount ?? 0), [budget?.limitAmount]);

  const name = localizeCategoryName(category.name, language);
  const pct = budget ? Math.round((spent / budget.limitAmount) * 100) : 0;
  const status = !budget ? "none" : spent > budget.limitAmount ? "over" : pct > 80 ? "warning" : "safe";
  const dirty = limit !== (budget?.limitAmount ?? 0);
  const money = (v: number) => (hidden ? "•••" : formatIDR(v, { lang: language }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limit || limit <= 0) {
      setError(t.budgetsPage.limitRequired);
      return;
    }
    setError(null);
    try {
      await upsert.mutateAsync({ categoryId: category.id, month: period.month, year: period.year, limitAmount: limit });
      toast.success(t.budgetsPage.saved);
    } catch (err) {
      setError((err as Error).message || t.budgetsPage.saveFailed);
    }
  };

  const clear = async () => {
    if (!budget) return;
    try {
      await remove.mutateAsync(budget.id);
      toast.success(t.budgetsPage.removed);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <li className="flex flex-col gap-3 px-2 py-3 sm:flex-row sm:items-center sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CategoryBubble icon={category.icon} color={category.color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-fg">{name}</p>
            {status === "none" ? (
              <Badge>{t.budgetsPage.noBudget}</Badge>
            ) : (
              <Badge tone={status === "over" ? "negative" : status === "warning" ? "warning" : "positive"}>
                {status === "over" ? t.overview.budgets.statusOver : status === "warning" ? t.overview.budgets.statusWarning : t.overview.budgets.statusSafe}
              </Badge>
            )}
          </div>
          {budget ? (
            <>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, pct)}
                aria-label={name}
              >
                <div
                  className={cn("h-full rounded-full transition-[width] duration-slow", status === "over" ? "bg-negative" : status === "warning" ? "bg-warning" : "bg-positive")}
                  style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                />
              </div>
              <p className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-fg-subtle">
                <span>{fmt(t.budgetsPage.spentOf, { spent: money(spent), limit: money(budget.limitAmount) })}</span>
                <span className={cn("tabular font-medium", status === "over" ? "text-negative-fg" : "text-fg-muted")}>
                  {status === "over"
                    ? fmt(t.budgetsPage.over, { amount: money(spent - budget.limitAmount) })
                    : fmt(t.budgetsPage.left, { amount: money(budget.limitAmount - spent) })}
                </span>
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-xs text-fg-subtle">{fmt(t.budgetsPage.spentOnly, { spent: money(spent) })}</p>
          )}
        </div>
      </div>

      <form onSubmit={save} noValidate className="flex items-start gap-2 sm:w-[300px]">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={`limit-${category.id}`}>
            {t.budgetsPage.setLimit} · {name}
          </label>
          <AmountInput
            id={`limit-${category.id}`}
            value={limit}
            onValueChange={setLimit}
            placeholder={t.budgetsPage.setLimit}
            aria-invalid={Boolean(error) || undefined}
          />
          {error && (
            <p role="alert" className="mt-1 text-xs font-medium text-negative-fg">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" variant={dirty ? "primary" : "outline"} loading={upsert.isPending} disabled={!dirty && Boolean(budget)}>
          {t.budgetsPage.save}
        </Button>
        {budget && (
          <Tooltip content={t.budgetsPage.remove}>
            <Button type="button" variant="danger-ghost" size="icon" onClick={clear} loading={remove.isPending} aria-label={`${t.budgetsPage.remove} · ${name}`}>
              {!remove.isPending && <Trash2 aria-hidden />}
            </Button>
          </Tooltip>
        )}
      </form>
    </li>
  );
}
