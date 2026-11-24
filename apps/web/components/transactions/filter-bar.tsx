"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, CalendarRange, Receipt, RotateCcw, Search, SlidersHorizontal, Tag, Wallet, X } from "lucide-react";
import type { Category, Wallet as WalletT } from "@/lib/api/client";
import { useLanguage } from "@/context/language-context";
import { localizeCategoryName, localizeWalletName } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";

export type RangePreset = "period" | "all" | "custom";

export interface LedgerFilters {
  search: string;
  type: "ALL" | "EXPENSE" | "INCOME";
  walletId: string;
  categoryId: string;
  hasReceiptOnly: boolean;
  sortBy: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  range: RangePreset;
  from: string;
  to: string;
}

export const DEFAULT_FILTERS: LedgerFilters = {
  search: "",
  type: "ALL",
  walletId: "",
  categoryId: "",
  hasReceiptOnly: false,
  sortBy: "date_desc",
  range: "period",
  from: "",
  to: "",
};

export function isFiltered(f: LedgerFilters) {
  return (
    f.search.trim() !== "" ||
    f.type !== "ALL" ||
    f.walletId !== "" ||
    f.categoryId !== "" ||
    f.hasReceiptOnly ||
    f.sortBy !== "date_desc" ||
    f.range !== "period"
  );
}

interface FilterBarProps {
  filters: LedgerFilters;
  onChange: (patch: Partial<LedgerFilters>) => void;
  onReset: () => void;
  wallets: WalletT[];
  categories: Category[];
  periodLabel: string;
}

export function FilterBar({ filters, onChange, onReset, wallets, categories, periodLabel }: FilterBarProps) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = React.useState(false);
  const advancedCount =
    (filters.walletId ? 1 : 0) +
    (filters.categoryId ? 1 : 0) +
    (filters.hasReceiptOnly ? 1 : 0) +
    (filters.sortBy !== "date_desc" ? 1 : 0) +
    (filters.range !== "period" ? 1 : 0);

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.walletId) {
    const w = wallets.find((x) => x.id === filters.walletId);
    chips.push({ key: "wallet", label: localizeWalletName(w?.name, language) || t.transactions.colPocket, clear: () => onChange({ walletId: "" }) });
  }
  if (filters.categoryId) {
    const c = categories.find((x) => x.id === filters.categoryId);
    chips.push({ key: "cat", label: localizeCategoryName(c?.name, language) || t.transactions.colCategory, clear: () => onChange({ categoryId: "" }) });
  }
  if (filters.hasReceiptOnly) chips.push({ key: "receipt", label: t.transactions.withReceipt, clear: () => onChange({ hasReceiptOnly: false }) });
  if (filters.range === "all") chips.push({ key: "range", label: t.transactions.rangeAll, clear: () => onChange({ range: "period" }) });
  if (filters.range === "custom")
    chips.push({
      key: "range",
      label: `${filters.from || "…"} → ${filters.to || "…"}`,
      clear: () => onChange({ range: "period", from: "", to: "" }),
    });

  const advanced = (
    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
      <Select
        aria-label={t.transactions.colPocket}
        value={filters.walletId}
        onChange={(e) => onChange({ walletId: e.target.value })}
        leadingIcon={<Wallet />}
      >
        <option value="">{t.transactions.allPockets}</option>
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {localizeWalletName(w.name, language)}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t.transactions.colCategory}
        value={filters.categoryId}
        onChange={(e) => onChange({ categoryId: e.target.value })}
        leadingIcon={<Tag />}
      >
        <option value="">{t.transactions.allCategories}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {localizeCategoryName(c.name, language)}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t.transactions.rangeLabel}
        value={filters.range}
        onChange={(e) => onChange({ range: e.target.value as RangePreset })}
        leadingIcon={<CalendarRange />}
      >
        <option value="period">
          {t.transactions.rangePeriod} · {periodLabel}
        </option>
        <option value="all">{t.transactions.rangeAll}</option>
        <option value="custom">{t.transactions.rangeCustom}</option>
      </Select>
      <Select
        aria-label={t.transactions.sortLabel}
        value={filters.sortBy}
        onChange={(e) => onChange({ sortBy: e.target.value as LedgerFilters["sortBy"] })}
        leadingIcon={<ArrowUpDown />}
      >
        <option value="date_desc">{t.transactions.sortDateDesc}</option>
        <option value="date_asc">{t.transactions.sortDateAsc}</option>
        <option value="amount_desc">{t.transactions.sortAmountDesc}</option>
        <option value="amount_asc">{t.transactions.sortAmountAsc}</option>
      </Select>

      {filters.range === "custom" && (
        <div className="grid grid-cols-2 gap-3 min-[480px]:col-span-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-fg-muted">{t.transactions.from}</span>
            <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-fg-muted">{t.transactions.to}</span>
            <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />
          </label>
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={filters.hasReceiptOnly}
        onClick={() => onChange({ hasReceiptOnly: !filters.hasReceiptOnly })}
        className={cn(
          "flex h-11 items-center justify-between gap-3 rounded-xl border px-3.5 text-sm font-medium transition coarse:h-12",
          filters.hasReceiptOnly ? "border-ai/50 bg-ai/10 text-ai-fg" : "border-line bg-surface-1 text-fg-muted hover:border-line-strong"
        )}
      >
        <span className="flex items-center gap-2">
          <Receipt className="size-4" aria-hidden />
          {t.transactions.withReceipt}
        </span>
        <span
          aria-hidden
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            filters.hasReceiptOnly ? "bg-ai" : "bg-surface-3"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-base ease-emphasized",
              filters.hasReceiptOnly ? "translate-x-[18px]" : "translate-x-0.5"
            )}
          />
        </span>
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input
            id="tx-search"
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder={t.transactions.searchPlaceholder}
            aria-label={t.common.search}
            className="pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
            autoComplete="off"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ search: "" })}
              aria-label={t.common.clear}
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            label={t.transactions.filters}
            value={filters.type}
            onChange={(v) => onChange({ type: v })}
            className="flex-1 md:flex-none"
            options={[
              { value: "ALL", label: t.transactions.typeAll },
              { value: "EXPENSE", label: t.transactions.typeExpense },
              { value: "INCOME", label: t.transactions.typeIncome },
            ]}
          />
          <Button
            variant={expanded || advancedCount ? "secondary" : "outline"}
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-controls="ledger-advanced-filters"
            className="relative"
          >
            <SlidersHorizontal aria-hidden />
            <span className="hidden sm:inline">{t.transactions.filters}</span>
            {advancedCount > 0 && (
              <span className="tabular grid size-5 place-items-center rounded-full bg-brand text-[0.75rem] font-bold text-white">
                {advancedCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="ledger-advanced-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-line bg-surface-2/40 p-3">{advanced}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {(chips.length > 0 || isFiltered(filters)) && (
        <div className="flex flex-wrap items-center gap-2">
          <AnimatePresence initial={false}>
            {chips.map((c) => (
              <motion.span
                key={c.key}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand/10 py-1 pl-3 pr-1 text-xs font-semibold text-brand-fg"
              >
                {c.label}
                <button
                  type="button"
                  onClick={c.clear}
                  aria-label={`${t.common.clear}: ${c.label}`}
                  className="grid size-6 place-items-center rounded-full hover:bg-brand/15"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          {isFiltered(filters) && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw aria-hidden />
              {t.transactions.resetFilters}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
