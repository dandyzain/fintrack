"use client";

import React from "react";
import {
  TrendingDown,
  Sparkles,
  Receipt,
  Award,
  AlertCircle,
  CheckCircle2,
  PieChart,
  BarChart3,
  CalendarDays,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { DashboardAnalyticsResponse } from "@fintrack/shared";

interface AnalyticsStatsHubProps {
  analytics: DashboardAnalyticsResponse | null;
}

export function AnalyticsStatsHub({ analytics }: AnalyticsStatsHubProps) {
  if (!analytics) return null;

  const { summary, metrics, categoryBreakdown, financialHealth } = analytics;

  // Computed metric values with fallbacks
  const dailyAverage = metrics?.dailyAverageExpense || Math.round((summary?.totalExpense || 0) / 30);
  const avgPerTx = metrics?.averageTransactionAmount || (summary?.expenseCount ? Math.round(summary.totalExpense / summary.expenseCount) : 0);
  const largestTx = metrics?.largestExpense;
  const receiptCount = metrics?.receiptScanCount || 0;
  const receiptTotal = metrics?.receiptScanTotalAmount || 0;

  // Financial health status
  const healthScore = financialHealth?.score ?? 88;
  const healthLabel = financialHealth?.label ?? "Optimal Health";
  const healthStatus = financialHealth?.status ?? "HEALTHY";
  const healthMessage = financialHealth?.message ?? "Pengeluaran Anda sangat terkendali dengan rasio arus kas positif.";

  const getHealthBadgeColor = () => {
    switch (healthStatus) {
      case "EXCELLENT":
      case "HEALTHY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]";
      case "WARNING":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]";
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
      default:
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Bar: Section Title & Health Score Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                <BarChart3 className="w-3.5 h-3.5" />
              </span>
              <span>Statistik & Wawasan Finansial</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 text-violet-600 dark:text-violet-300 font-semibold border border-violet-500/20 flex items-center gap-1 shadow-sm">
              <Zap className="w-2.5 h-2.5 text-cyan-400" /> Bento Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            Analisis pola konsumsi, rata-rata harian, dan metrik kesehatan kas
          </p>
        </div>

        {/* Financial Health Pill Indicator */}
        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 self-start sm:self-auto backdrop-blur-md transition-all ${getHealthBadgeColor()}`}>
          {healthStatus === "EXCELLENT" || healthStatus === "HEALTHY" ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          ) : (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white">Skor {healthScore}/100</span>
            <span className="text-xs font-semibold opacity-90">• {healthLabel}</span>
          </div>
        </div>
      </div>

      {/* 2. 4 Creative Modern Bento Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Rata-rata Pengeluaran Harian */}
        <div className="bento-card p-3.5 sm:p-4 rounded-xl border border-slate-200/90 dark:border-white/10 hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-cyan-500" /> Rerata / Hari
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20">
              HARIAN
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
            Rp {dailyAverage.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Proyeksi akhir bln: Rp {(metrics?.projectedMonthEndExpense || dailyAverage * 30).toLocaleString("id-ID")}
          </p>
        </div>

        {/* Metric 2: Rata-rata per Transaksi */}
        <div className="bento-card p-3.5 sm:p-4 rounded-xl border border-slate-200/90 dark:border-white/10 hover:border-violet-500/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-violet-500" /> Rerata / Belanja
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20">
              PER TX
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
            Rp {avgPerTx.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Dari {summary?.expenseCount || 0} kali transaksi keluar
          </p>
        </div>

        {/* Metric 3: Pengeluaran Terbesar Bulan Ini */}
        <div className="bento-card p-3.5 sm:p-4 rounded-xl border border-slate-200/90 dark:border-white/10 hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" /> Terbesar Bulan Ini
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
              PUNCAK
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {largestTx ? `Rp ${Number(largestTx.amount).toLocaleString("id-ID")}` : "-"}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate font-medium">
            {largestTx ? largestTx.merchantName || "Transaksi Manual" : "Belum ada pengeluaran"}
          </p>
        </div>

        {/* Metric 4: Struk AI Terverifikasi */}
        <div className="bento-card p-3.5 sm:p-4 rounded-xl border border-slate-200/90 dark:border-white/10 hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-500" /> Struk Vision AI
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
              VISION
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {receiptCount} Struk
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Total: Rp {receiptTotal.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      {/* 3. AI Financial Advisory & Category Breakdown Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Advisory & Health Bar (1 Col) */}
        <div className="bento-card p-4 sm:p-5 rounded-xl border border-slate-200/90 dark:border-white/10 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-violet-500" /> Rasio Kesehatan Kas
              </span>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                {metrics?.savingsRatio ?? 0}% Tabungan
              </span>
            </div>

            {/* Glowing Gradient Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800/90 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-white/5">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                style={{ width: `${Math.min(100, Math.max(5, healthScore))}%` }}
              />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-white/5 font-medium">
              💡 {healthMessage}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-slate-100 dark:border-white/5">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Rasio Belanja/Masuk</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {metrics?.expenseToIncomeRatio ?? 0}%
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Total Mutasi</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {metrics?.totalTransactions ?? ((summary?.expenseCount || 0) + (summary?.incomeCount || 0))} transaksi
              </span>
            </div>
          </div>
        </div>

        {/* Category Spending Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bento-card p-4 sm:p-5 rounded-xl border border-slate-200/90 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-cyan-500" />
                Distribusi Pengeluaran per Kategori
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                Porsi pembagian biaya belanja bulan ini
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {categoryBreakdown?.length || 0} Kategori Aktif
            </span>
          </div>

          {(!categoryBreakdown || categoryBreakdown.length === 0) ? (
            <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              Belum ada data pengeluaran berkategori bulan ini.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stacked Multi-Color Segment Bar with Glow */}
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/60 dark:border-white/5">
                {categoryBreakdown.map((cat) => (
                  <div
                    key={cat.categoryId}
                    style={{
                      width: `${Math.max(2, cat.percentage)}%`,
                      backgroundColor: cat.categoryColor || "#6366F1",
                    }}
                    title={`${cat.categoryName}: ${cat.percentage}% (Rp ${cat.totalAmount.toLocaleString("id-ID")})`}
                    className="h-full rounded-sm transition-all duration-300 hover:opacity-90"
                  />
                ))}
              </div>

              {/* Category Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {categoryBreakdown.slice(0, 4).map((cat) => (
                  <div
                    key={cat.categoryId}
                    className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/5 flex items-center justify-between gap-2 hover:border-slate-300 dark:hover:border-indigo-500/30 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: cat.categoryColor }}
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {cat.categoryName}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        ({cat.transactionCount}x)
                      </span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Rp {cat.totalAmount.toLocaleString("id-ID")}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
