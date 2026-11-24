"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, PieChart, Plus, ScanLine, Sparkles, Wallet } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { usePeriod } from "@/context/period-context";
import { useAppActions } from "@/context/app-actions-context";
import { useAnalytics, useCategories, useMe, useRecentTransactions, useWallets, useDeleteTransactionWithUndo } from "@/lib/api/queries";
import { fmt } from "@/lib/i18n/translations";
import { formatMonth, toNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { RevealItem, Stagger, InView } from "@/components/motion/reveal";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { BalanceHero } from "./balance-hero";
import { HealthCard } from "./health-card";
import { PocketsSection } from "./pockets";
import { InsightsRow } from "./insights";
import { BudgetsCard } from "./budgets";

// Recharts is ~100 kB; load it only when the charts render.
const CashflowChart = dynamic(() => import("./charts").then((m) => m.CashflowChart), {
  ssr: false,
  loading: () => <Skeleton className="h-60 w-full rounded-2xl sm:h-72" />,
});
const CategoryDonut = dynamic(() => import("./charts").then((m) => m.CategoryDonut), {
  ssr: false,
  loading: () => <Skeleton className="h-44 w-full rounded-2xl" />,
});

function greeting(t: ReturnType<typeof useLanguage>["t"]) {
  const h = new Date().getHours();
  if (h < 11) return t.overview.greetingMorning;
  if (h < 18) return t.overview.greetingAfternoon;
  return t.overview.greetingEvening;
}

export function OverviewPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const period = usePeriod();
  const { openScanner, openEntry, openWallets } = useAppActions();
  const me = useMe();
  const wallets = useWallets();
  const categories = useCategories();
  const analytics = useAnalytics(period);
  const previous = useAnalytics(period.previous);
  const recent = useRecentTransactions({ ...period.range, limit: 6, sortBy: "date_desc" });
  const deleteTx = useDeleteTransactionWithUndo();

  const totalBalance = useMemo(
    () => (wallets.data ?? []).reduce((s, w) => s + toNumber(w.balance), 0),
    [wallets.data]
  );
  const monthLabel = formatMonth(period.month, period.year, language);
  const firstName = me.data?.name.split(" ")[0] ?? "";
  const a = analytics.data;
  const isEmptyMonth = a && a.summary.totalIncome === 0 && a.summary.totalExpense === 0;
  const knownCategories = new Set((categories.data ?? []).map((c) => c.id));

  return (
    <Stagger className="space-y-6 pb-4 sm:space-y-8">
      <RevealItem className="flex flex-col gap-1 pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {greeting(t)}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-fg-subtle sm:text-base">{fmt(t.overview.subtitle, { month: monthLabel })}</p>
      </RevealItem>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <RevealItem className="lg:col-span-8">
          <BalanceHero
            totalBalance={totalBalance}
            walletCount={wallets.data?.length ?? 0}
            current={a}
            previous={previous.data}
            loading={wallets.isPending || analytics.isPending}
          />
        </RevealItem>
        <RevealItem className="lg:col-span-4">
          <HealthCard analytics={a} loading={analytics.isPending} />
        </RevealItem>
      </div>

      {isEmptyMonth && !recent.data?.items.length && (
        <RevealItem>
          <Onboarding onScan={openScanner} onAdd={openEntry} onPockets={openWallets} />
        </RevealItem>
      )}

      <RevealItem>
        <PocketsSection wallets={wallets.data} loading={wallets.isPending} />
      </RevealItem>

      <InView>
        <InsightsRow analytics={a} previous={previous.data} loading={analytics.isPending} />
      </InView>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <InView className="lg:col-span-8">
          <Card as="section" aria-labelledby="cashflow-heading" className="h-full p-5 sm:p-6">
            <CardHeader
              id="cashflow-heading"
              icon={<Activity />}
              title={t.overview.cashflow.title}
              description={t.overview.cashflow.subtitle}
              action={
                <div className="hidden items-center gap-3 text-xs text-fg-muted sm:flex" aria-hidden>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-positive" /> {t.overview.income}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-negative" /> {t.overview.expense}
                  </span>
                </div>
              }
            />
            <div className="mt-5">
              {analytics.isPending ? (
                <Skeleton className="h-60 w-full rounded-2xl sm:h-72" />
              ) : a?.dailyTrends?.some((d) => d.expenseAmount || d.incomeAmount) ? (
                <CashflowChart data={a.dailyTrends} />
              ) : (
                <EmptyState compact icon={<Activity />} title={t.overview.cashflow.empty} />
              )}
            </div>
          </Card>
        </InView>

        <InView className="lg:col-span-4">
          <Card as="section" aria-labelledby="categories-heading" className="h-full p-5 sm:p-6">
            <CardHeader
              id="categories-heading"
              icon={<PieChart />}
              title={t.overview.categories.title}
              description={t.overview.categories.subtitle}
            />
            <div className="mt-5">
              {analytics.isPending ? (
                <Skeleton className="h-44 w-full rounded-2xl" />
              ) : a?.categoryBreakdown?.length ? (
                <CategoryDonut
                  data={a.categoryBreakdown}
                  total={a.summary.totalExpense}
                  onSelect={(id) => {
                    if (knownCategories.has(id)) router.push(`/transactions?categoryId=${encodeURIComponent(id)}`);
                  }}
                />
              ) : (
                <EmptyState compact icon={<PieChart />} title={t.overview.categories.empty} />
              )}
            </div>
          </Card>
        </InView>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <InView className="lg:col-span-7 xl:col-span-8">
          <Card as="section" aria-labelledby="recent-heading" className="h-full p-3 sm:p-4">
            <CardHeader
              id="recent-heading"
              className="px-2 pt-2 sm:px-2"
              title={t.overview.recent.title}
              description={fmt(t.overview.recent.subtitle, { month: monthLabel })}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/transactions">
                    {t.common.viewAll}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            />
            <div className="mt-3">
              {recent.isPending ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : recent.data?.items.length ? (
                <div role="list" className="space-y-0.5">
                  {recent.data.items.map((tx) => (
                    <div role="listitem" key={tx.id}>
                      <TransactionRow tx={tx} onDelete={(x) => deleteTx(x)} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  className="m-2"
                  icon={<Sparkles />}
                  title={t.overview.recent.emptyTitle}
                  description={t.overview.recent.emptyDesc}
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button variant="ai" size="sm" onClick={openScanner}>
                        <ScanLine aria-hidden />
                        {t.nav.scan}
                      </Button>
                      <Button variant="outline" size="sm" onClick={openEntry}>
                        <Plus aria-hidden />
                        {t.nav.add}
                      </Button>
                    </div>
                  }
                />
              )}
            </div>
          </Card>
        </InView>

        <InView className="lg:col-span-5 xl:col-span-4">
          <BudgetsCard items={a?.budgetComparisons} loading={analytics.isPending} />
        </InView>
      </div>
    </Stagger>
  );
}

function Onboarding({ onScan, onAdd, onPockets }: { onScan: () => void; onAdd: () => void; onPockets: () => void }) {
  const { t } = useLanguage();
  const steps = [
    { icon: Wallet, text: t.overview.onboarding.step1, action: onPockets },
    { icon: ScanLine, text: t.overview.onboarding.step2, action: onScan },
    { icon: Sparkles, text: t.overview.onboarding.step3, action: onAdd },
  ];
  return (
    <Card className="overflow-hidden p-5 sm:p-6">
      <h2 className="text-base font-semibold tracking-tight text-fg">{t.overview.onboarding.title}</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={s.action}
              className="flex h-full w-full items-start gap-3 rounded-2xl border border-line bg-surface-2/50 p-4 text-left transition hover:border-brand/40 hover:bg-brand/[0.04]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-fg" aria-hidden>
                <s.icon className="size-4" />
              </span>
              <span className="text-sm text-fg">
                <span className="mb-0.5 block text-xs font-semibold text-fg-subtle">{i + 1}</span>
                {s.text}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}
