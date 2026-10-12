"use client";

import React from "react";
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Receipt,
  Wallet,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { localizeCategoryName, localizeWalletName } from "@/lib/i18n/translations";

interface WalletItem {
  id: string;
  name: string;
  balance: number;
}

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface TransactionFilterState {
  search: string;
  type: "ALL" | "EXPENSE" | "INCOME";
  walletId: string;
  categoryId: string;
  hasReceiptOnly: boolean;
  sortBy: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
}

interface TransactionFilterBarProps {
  filters: TransactionFilterState;
  onFilterChange: (filters: Partial<TransactionFilterState>) => void;
  onResetFilters: () => void;
  wallets: WalletItem[];
  categories: CategoryItem[];
  totalShowing: number;
}

export function TransactionFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  wallets,
  categories,
  totalShowing,
}: TransactionFilterBarProps) {
  const { t, language } = useLanguage();
  const isFiltered =
    filters.search.trim() !== "" ||
    filters.type !== "ALL" ||
    filters.walletId !== "" ||
    filters.categoryId !== "" ||
    filters.hasReceiptOnly ||
    filters.sortBy !== "date_desc";

  return (
    <div className="space-y-3 bg-white/80 dark:bg-[#121826]/80 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-slate-200/90 dark:border-white/10 mb-4 shadow-sm transition-all">
      {/* Top Row: Search Input & Quick Type Segmented Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder={t.filterBar.searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              title="Clear keyword"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Type Filter Buttons */}
        <div className="flex w-full sm:w-auto sm:inline-flex p-1 bg-slate-100 dark:bg-slate-900/80 rounded-lg border border-slate-200/80 dark:border-white/10">
          <button
            onClick={() => onFilterChange({ type: "ALL" })}
            className={`flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              filters.type === "ALL"
                ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {t.common.all}
          </button>
          <button
            onClick={() => onFilterChange({ type: "EXPENSE" })}
            className={`flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              filters.type === "EXPENSE"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${filters.type === "EXPENSE" ? "bg-white" : "bg-rose-500"}`} />
            {t.dashboard.expenseLegend}
          </button>
          <button
            onClick={() => onFilterChange({ type: "INCOME" })}
            className={`flex-1 sm:flex-none justify-center px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              filters.type === "INCOME"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${filters.type === "INCOME" ? "bg-white" : "bg-cyan-400"}`} />
            {t.dashboard.incomeLegend}
          </button>
        </div>
      </div>

      {/* Bottom Row: Dropdown Filters & Sort Selector */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:flex-1 min-w-0">
          {/* Filter Dompet / Kantong */}
          <div className="relative min-w-0">
            <select
              value={filters.walletId}
              onChange={(e) => onFilterChange({ walletId: e.target.value })}
              className="w-full sm:w-auto pl-7 pr-3 sm:pr-7 py-2 sm:py-1.5 text-xs bg-slate-50/70 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer truncate"
            >
              <option value="">
                {t.filterBar.allPockets}
              </option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {localizeWalletName(w.name, language)}
                </option>
              ))}
            </select>
            <Wallet className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter Kategori */}
          <div className="relative min-w-0">
            <select
              value={filters.categoryId}
              onChange={(e) => onFilterChange({ categoryId: e.target.value })}
              className="w-full sm:w-auto pl-7 pr-3 sm:pr-7 py-2 sm:py-1.5 text-xs bg-slate-50/70 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer truncate"
            >
              <option value="">
                {t.filterBar.allCategories}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {localizeCategoryName(c.name, language)}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Toggle Struk AI Saja */}
          <button
            onClick={() => onFilterChange({ hasReceiptOnly: !filters.hasReceiptOnly })}
            className={`justify-center sm:justify-start px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 whitespace-nowrap ${
              filters.hasReceiptOnly
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-600 dark:text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                : "bg-slate-50/70 dark:bg-slate-900/80 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
            }`}
          >
            <Receipt className="w-3 h-3 text-cyan-500" />
            <span>{language === "id" ? "Struk AI" : "AI Receipt"}</span>
            {filters.hasReceiptOnly && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm" />}
          </button>

          {/* Sort By Selector */}
          <div className="relative min-w-0">
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as any })}
              className="w-full sm:w-auto pl-7 pr-3 sm:pr-7 py-2 sm:py-1.5 text-xs bg-slate-50/70 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer truncate"
            >
              <option value="date_desc">{language === "id" ? "Terbaru (Tanggal ↓)" : "Newest (Date ↓)"}</option>
              <option value="date_asc">{language === "id" ? "Terlama (Tanggal ↑)" : "Oldest (Date ↑)"}</option>
              <option value="amount_desc">{language === "id" ? "Nominal Terbesar (Rp ↓)" : "Highest Amount (Rp ↓)"}</option>
              <option value="amount_asc">{language === "id" ? "Nominal Terkecil (Rp ↑)" : "Lowest Amount (Rp ↑)"}</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Info: Counter & Reset Filter Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {totalShowing} {language === "id" ? "Transaksi" : "Transactions"}
          </span>

          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition"
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.filterBar.resetFilters}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
