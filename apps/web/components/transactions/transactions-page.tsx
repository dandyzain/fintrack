"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Download, Inbox, Loader2, Plus, SearchX } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/language-context";
import { usePeriod } from "@/context/period-context";
import { useAppActions } from "@/context/app-actions-context";
import { useCategories, useDeleteTransactionWithUndo, useTransactionList, useWallets } from "@/lib/api/queries";
import { transactionsCsvUrl, type Transaction, type TransactionQuery } from "@/lib/api/client";
import { fmt } from "@/lib/i18n/translations";
import { formatDate, formatMonth, toDateInputValue, toNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Money } from "@/components/ui/money";
import { useMounted } from "@/lib/hooks/use-mounted";
import { TransactionRow } from "./transaction-row";
import { DEFAULT_FILTERS, FilterBar, isFiltered, type LedgerFilters } from "./filter-bar";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export interface TransactionsPageProps {
  initialWalletId?: string;
  initialCategoryId?: string;
  focusSearch?: boolean;
}

export function TransactionsPage({ initialWalletId = "", initialCategoryId = "", focusSearch = false }: TransactionsPageProps) {
  const { t, language } = useLanguage();
  const mounted = useMounted();
  const period = usePeriod();
  const reduce = useReducedMotion();
  const { openEntry } = useAppActions();
  const wallets = useWallets();
  const categories = useCategories();
  const deleteTx = useDeleteTransactionWithUndo();

  const [filters, setFilters] = React.useState<LedgerFilters>(() => ({
    ...DEFAULT_FILTERS,
    walletId: initialWalletId,
    categoryId: initialCategoryId,
  }));
  const [exporting, setExporting] = React.useState(false);
  const search = useDebounced(filters.search, 250);

  React.useEffect(() => {
    if (focusSearch) document.getElementById("tx-search")?.focus();
  }, [focusSearch]);

  // Follow URL changes (e.g. arriving from a pocket card or the category donut).
  React.useEffect(() => {
    setFilters((f) =>
      f.walletId === initialWalletId && f.categoryId === initialCategoryId
        ? f
        : { ...f, walletId: initialWalletId, categoryId: initialCategoryId }
    );
  }, [initialWalletId, initialCategoryId]);

  const query = React.useMemo<TransactionQuery>(() => {
    const dates =
      filters.range === "period"
        ? period.range
        : filters.range === "custom"
        ? { startDate: filters.from || undefined, endDate: filters.to || undefined }
        : {};
    return {
      search,
      type: filters.type,
      walletId: filters.walletId,
      categoryId: filters.categoryId,
      hasReceiptOnly: filters.hasReceiptOnly,
      sortBy: filters.sortBy,
      limit: 20,
      ...dates,
    };
  }, [search, filters, period.range]);

  const list = useTransactionList(query);
  const items = React.useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const total = list.data?.pages[0]?.pagination.total ?? 0;
  const byDate = filters.sortBy.startsWith("date");

  const groups = React.useMemo(() => {
    if (!byDate) return [{ key: "all", label: "", items, net: 0 }];
    const map = new Map<string, Transaction[]>();
    for (const tx of items) {
      const key = toDateInputValue(new Date(tx.date));
      map.set(key, [...(map.get(key) ?? []), tx]);
    }
    const today = toDateInputValue(new Date());
    const yesterday = toDateInputValue(new Date(Date.now() - 86_400_000));
    return Array.from(map.entries()).map(([key, txs]) => ({
      key,
      label:
        key === today
          ? t.transactions.today
          : key === yesterday
          ? t.transactions.yesterday
          : formatDate(new Date(`${key}T00:00:00`), language, "weekday"),
      items: txs,
      // Transfers move money between pockets: they don't change the day's net.
      net: txs.reduce((s, x) => s + (x.type === "INCOME" ? 1 : x.type === "EXPENSE" ? -1 : 0) * toNumber(x.amount), 0),
    }));
  }, [items, byDate, t, language]);

  // Infinite scroll with a visible "Load more" fallback.
  const sentinel = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = sentinel.current;
    if (!el || !list.hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !list.isFetchingNextPage) list.fetchNextPage();
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [list.hasNextPage, list.isFetchingNextPage, list.fetchNextPage, list]);

  /** The server streams every matching row (no cap) with spreadsheet-safe cells. */
  const exportCsv = () => {
    setExporting(true);
    const a = document.createElement("a");
    a.href = transactionsCsvUrl(query, language);
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(fmt(t.transactions.exported, { count: total }));
    window.setTimeout(() => setExporting(false), 1200);
  };

  const periodLabel = mounted ? formatMonth(period.month, period.year, language) : "";
  const filtered = isFiltered(filters) || Boolean(search);

  return (
    <div className="space-y-5 pb-4 pt-2 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{t.transactions.title}</h1>
          <p className="mt-1 text-sm text-fg-subtle sm:text-base">{t.transactions.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} loading={exporting} disabled={!total}>
            {!exporting && <Download aria-hidden />}
            {t.transactions.export}
          </Button>
          <Button onClick={openEntry} className="hidden sm:inline-flex">
            <Plus aria-hidden />
            {t.nav.add}
          </Button>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        wallets={wallets.data ?? []}
        categories={categories.data ?? []}
        periodLabel={periodLabel}
      />

      <Card className="@container p-2 sm:p-3">
        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1 text-sm text-fg-subtle" aria-live="polite">
          <span>
            {list.isPending
              ? t.common.loading
              : items.length < total
              ? fmt(t.transactions.countOf, { shown: items.length, total })
              : fmt(t.transactions.count, { count: total })}
          </span>
          {list.isFetching && !list.isFetchingNextPage && !list.isPending && (
            <Loader2 className="size-4 animate-spin text-brand-fg" aria-hidden />
          )}
        </div>

        {list.isPending ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.isError ? (
          <EmptyState
            className="m-2"
            icon={<SearchX />}
            title={t.common.somethingWrong}
            description={t.common.couldNotLoad}
            action={
              <Button variant="outline" size="sm" onClick={() => list.refetch()}>
                {t.common.retry}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            className="m-2"
            icon={filtered ? <SearchX /> : <Inbox />}
            title={filtered ? t.transactions.emptyFilteredTitle : t.transactions.emptyTitle}
            description={filtered ? t.transactions.emptyFilteredDesc : t.transactions.emptyDesc}
            action={
              filtered ? (
                <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  {t.transactions.resetFilters}
                </Button>
              ) : (
                <Button size="sm" onClick={openEntry}>
                  <Plus aria-hidden />
                  {t.nav.add}
                </Button>
              )
            }
          />
        ) : (
          <div className={list.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label || undefined}>
                {g.label && (
                  <div className="sticky top-16 z-10 -mx-0.5 flex items-center justify-between gap-3 bg-surface-1/90 px-3 py-2 backdrop-blur-md">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{g.label}</h2>
                    <span className="text-xs text-fg-subtle">
                      <Money value={g.net} sign="always" tone={g.net >= 0 ? "positive" : "negative"} className="font-semibold" />
                    </span>
                  </div>
                )}
                <ul className="space-y-0.5">
                  <AnimatePresence initial={false}>
                    {g.items.map((tx) => (
                      <motion.li
                        key={tx.id}
                        layout={!reduce ? "position" : false}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.22 } }}
                      >
                        <TransactionRow tx={tx} onDelete={(x) => deleteTx(x)} showDate={!byDate} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            ))}

            <div ref={sentinel} className="flex justify-center px-2 py-4">
              {list.hasNextPage ? (
                <Button variant="outline" onClick={() => list.fetchNextPage()} loading={list.isFetchingNextPage}>
                  {list.isFetchingNextPage ? t.transactions.loadingMore : t.transactions.loadMore}
                </Button>
              ) : (
                <p className="text-xs text-fg-subtle">{t.transactions.endOfList}</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
