"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
  PlusCircle,
  Receipt,
  Calendar,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Moon,
  Sun,
  LogOut,
  User as UserIcon,
  Wifi,
  Cpu,
  Layers,
  ChevronRight,
} from "lucide-react";
import { DailyTrendChart } from "@/components/charts/daily-trend-chart";
import { BudgetProgressCard } from "@/components/charts/budget-progress-card";
import { AnalyticsStatsHub } from "@/components/analytics/analytics-stats-hub";
import { TransactionFilterBar, type TransactionFilterState } from "@/components/transactions/transaction-filter-bar";
import { ReceiptScannerModal } from "@/components/modals/receipt-scanner-modal";
import { ManualTransactionModal } from "@/components/modals/manual-transaction-modal";
import { WalletManagementModal } from "@/components/modals/wallet-management-modal";
import type { DashboardAnalyticsResponse, AuthUser } from "@fintrack/shared";

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

interface TransactionItem {
  id: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  date: string;
  merchantName: string | null;
  notes: string | null;
  receiptImageUrl: string | null;
  wallet: { name: string };
  category: { name: string; color: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State for Transactions
  const [filters, setFilters] = useState<TransactionFilterState>({
    search: "",
    type: "ALL",
    walletId: "",
    categoryId: "",
    hasReceiptOnly: false,
    sortBy: "date_desc",
  });

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Sync with HTML class set by anti-FOUC script
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("fintrack-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("fintrack-theme", "light");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  const fetchFilteredTransactions = useCallback(async (currentFilters: TransactionFilterState) => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append("limit", "50");
      if (currentFilters.search.trim()) searchParams.append("search", currentFilters.search.trim());
      if (currentFilters.type !== "ALL") searchParams.append("type", currentFilters.type);
      if (currentFilters.walletId) searchParams.append("walletId", currentFilters.walletId);
      if (currentFilters.categoryId) searchParams.append("categoryId", currentFilters.categoryId);
      if (currentFilters.hasReceiptOnly) searchParams.append("hasReceipt", "true");
      if (currentFilters.sortBy) searchParams.append("sortBy", currentFilters.sortBy);

      const res = await fetch(`/api/transactions?${searchParams.toString()}`);
      const json = await res.json();
      if (json.success && json.data?.items) {
        setTransactions(json.data.items);
      }
    } catch (err) {
      console.error("Failed to load transactions with filters:", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Verify Authentication
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401) {
        router.push("/login");
        return;
      }
      const meJson = await meRes.json();
      if (meJson.success && meJson.data?.user) {
        setCurrentUser(meJson.data.user);
      }

      const [analyticsRes, walletsRes, categoriesRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/wallets"),
        fetch("/api/categories"),
      ]);

      const [analyticsJson, walletsJson, categoriesJson] = await Promise.all([
        analyticsRes.json(),
        walletsRes.json(),
        categoriesRes.json(),
      ]);

      if (analyticsJson.success) setAnalytics(analyticsJson.data);
      if (walletsJson.success) setWallets(walletsJson.data);
      if (categoriesJson.success) setCategories(categoriesJson.data);

      await fetchFilteredTransactions(filters);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [router, filters, fetchFilteredTransactions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reactive debounce for filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFilteredTransactions(filters);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, fetchFilteredTransactions]);

  const totalWalletBalance = wallets.reduce(
    (sum, w) => sum + Number(w.balance || 0),
    0
  );

  const currentMonthName = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const savingsRate =
    (analytics?.summary.totalIncome || 0) > 0
      ? Math.max(
          0,
          Math.round(
            ((analytics?.summary.netSavings || 0) / (analytics?.summary.totalIncome || 1)) * 100
          )
        )
      : 0;

  // Preset Card Gradients for Wallets
  const cardGradientStyles = [
    "virtual-card-platinum",
    "virtual-card-emerald",
    "virtual-card-indigo",
  ];

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 bg-[#F8FAFC] dark:bg-[#090D16] relative overflow-hidden transition-colors duration-200">
      {/* Background Decorative Ambient Neon Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/4 w-96 h-96 bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-40 right-10 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#090D16]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-200" />
              <img
                src="/logo.png"
                alt="FinTrack Logo"
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-white/20 shadow-sm flex-shrink-0"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  FinTrack
                </span>
                <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.4)] flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Creative
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Bento Finance & AI OCR Scanner
              </p>
            </div>
          </div>

          {/* Action CTAs & User Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
              title={isDarkMode ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
              className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#121826]/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1B2337] transition shadow-sm flex-shrink-0"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-violet-600" />
              )}
            </button>

            {/* Quick Actions (Desktop Only in Navbar) */}
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#121826] hover:bg-slate-50 dark:hover:bg-[#1B2337] border border-slate-200 dark:border-white/10 rounded-xl transition shadow-sm whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
              <span>Catat Manual</span>
            </button>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white glow-btn-cyan rounded-xl transition shadow-md whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 flex-shrink-0 text-white" />
              <span>Pindai Struk AI</span>
            </button>

            {/* User Profile Badge & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 text-white flex items-center justify-center font-bold text-[11px] sm:text-xs shadow-md ring-2 ring-violet-500/30 flex-shrink-0"
                    title={currentUser.name}
                  >
                    {currentUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[110px]">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight truncate max-w-[110px]">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  title="Keluar dari akun (Logout)"
                  aria-label="Logout"
                  className="p-1.5 sm:p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#121826]/80 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-[#1B2337] transition shadow-sm flex-shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-5 sm:space-y-6">
        {/* Header Title & Period */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Dashboard Finansial</span>
            </h1>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5 font-normal">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-violet-500" />
                {currentMonthName}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-0.5 shadow-sm">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /> Real-time Cloud
              </span>
              {currentUser && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Akun: <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-[#121826]/80 hover:bg-slate-50 dark:hover:bg-[#1B2337] rounded-xl border border-slate-200/80 dark:border-white/10 shadow-sm transition flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-violet-500" : ""}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </button>
        </div>

        {/* Mobile Quick Action Buttons (<sm screens) */}
        <div className="grid grid-cols-2 gap-2.5 sm:hidden">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl glow-btn-cyan text-white font-bold text-xs shadow-md active:scale-98 transition"
          >
            <Zap className="w-4 h-4 flex-shrink-0 text-white" />
            <span>Pindai Struk AI</span>
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/90 dark:bg-[#121826] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm active:scale-98 transition"
          >
            <PlusCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
            <span>Catat Manual</span>
          </button>
        </div>

        {/* =========================================================
            CREATIVE MODERN BENTO GRID: HERO & TOP KPIS
            ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Bento Card 1: Main Balance Hero (2 Cols on lg) */}
          <div className="lg:col-span-2 bento-hero bento-card p-5 sm:p-7 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  Total Saldo Finansial
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25 flex items-center gap-1 shadow-sm">
                  <ArrowUpRight className="w-3 h-3" /> +14.2% Bulan Ini
                </span>
              </div>

              {/* Huge Balance Number */}
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Rp {totalWalletBalance.toLocaleString("id-ID")}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                Tersinkronisasi otomatis pada {wallets.length} rekening & kantong aktif
              </p>
            </div>

            {/* Income & Expense Summary Bar inside Hero Card */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-slate-200/70 dark:border-white/10">
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-black/20 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3 text-rose-500" /> Pengeluaran
                </span>
                <p className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                  Rp {(analytics?.summary.totalExpense || 0).toLocaleString("id-ID")}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-black/20 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-cyan-400" /> Pemasukan
                </span>
                <p className="text-sm sm:text-base font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 truncate">
                  Rp {(analytics?.summary.totalIncome || 0).toLocaleString("id-ID")}
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-50/80 dark:bg-black/20 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <PiggyBank className="w-3 h-3 text-violet-500" /> Arus Kas Bersih
                </span>
                <p className={`text-sm sm:text-base font-bold mt-0.5 truncate ${
                  (analytics?.summary.netSavings || 0) >= 0
                    ? "text-slate-900 dark:text-white"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  Rp {(analytics?.summary.netSavings || 0).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Financial Health Circular Gauge (1 Col on lg) */}
          <div className="bento-card p-5 sm:p-6 rounded-2xl flex flex-col justify-between border border-slate-200/90 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Health Meter
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                OPTIMAL
              </span>
            </div>

            {/* Circular Gauge Display */}
            <div className="py-2 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={isDarkMode ? "rgba(255,255,255,0.06)" : "#F1F5F9"}
                    strokeWidth="9"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#creativeGaugeGradient)"
                    strokeWidth="9"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - (analytics?.financialHealth?.score ?? 88) / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="creativeGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="50%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#6366F1" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {analytics?.financialHealth?.score ?? 88}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    DARI 100
                  </span>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2 text-center">
                Kondisi Finansial Prima
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Rasio Tabungan</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">{savingsRate}% Bulan ini</span>
            </div>
          </div>
        </div>

        {/* =========================================================
            BENTO VIRTUAL CARD DECK: DOMPET & KANTONG DIGITAL
            ========================================================= */}
        <div className="bento-card p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-500" />
                <span>Virtual Card Deck (Kantong Keuangan)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Alokasi saldo kartu debit & rekening aktif
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-white glow-btn-violet px-3 py-1.5 rounded-xl transition shadow-sm"
                title="Kelola Kantong (Tambah/Hapus)"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Kelola Kantong</span>
              </button>
            </div>
          </div>

          {/* Cards Deck Carousel / Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((w, index) => {
              const cardClass = cardGradientStyles[index % cardGradientStyles.length];
              const isFirst = index === 0;

              return (
                <div
                  key={w.id}
                  className={`p-5 rounded-2xl text-white ${cardClass} flex flex-col justify-between h-44 relative group cursor-pointer shadow-lg`}
                  onClick={() => setIsWalletModalOpen(true)}
                >
                  {/* Subtle Card Shimmer Watermark */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none blur-xl" />

                  {/* Card Top: Chip & Contactless */}
                  <div className="flex items-center justify-between z-10">
                    <div className="card-chip" />
                    <div className="flex items-center gap-1.5 opacity-80">
                      <Wifi className="w-4 h-4 transform rotate-90" />
                      <span className="text-[10px] font-bold tracking-widest uppercase">
                        {isFirst ? "PLATINUM" : "DIGITAL"}
                      </span>
                    </div>
                  </div>

                  {/* Card Middle: Balance */}
                  <div className="z-10 my-2">
                    <p className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">
                      Saldo Tersedia
                    </p>
                    <p className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                      Rp {Number(w.balance).toLocaleString("id-ID")}
                    </p>
                  </div>

                  {/* Card Bottom: Masked Number & Wallet Name */}
                  <div className="flex items-center justify-between z-10 pt-2 border-t border-white/10 text-xs">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest">
                        NAMA KANTONG
                      </p>
                      <p className="font-bold text-white text-xs truncate max-w-[130px]">
                        {w.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-mono tracking-widest text-slate-300">
                        •••• {1000 + (index * 243) % 9000}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Pocket Action Card */}
            <div
              onClick={() => setIsWalletModalOpen(true)}
              className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-violet-500/50 dark:hover:border-violet-500/50 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center h-44 cursor-pointer transition group"
            >
              <div className="w-11 h-11 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center group-hover:scale-110 transition shadow-sm mb-2">
                <PlusCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Tambah Kantong Baru
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Rekening, e-wallet, atau tabungan
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================
            ADVANCED FINANCIAL INTELLIGENCE & STATISTICS HUB
            ========================================================= */}
        <AnalyticsStatsHub analytics={analytics} />

        {/* =========================================================
            BENTO LOWER SECTION: CHARTS, BUDGET, TRANSACTIONS
            ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* 1. TREN ARUS KAS HARIAN: (order-2 lg:col-span-2) */}
          <div className="order-2 lg:order-1 lg:col-span-2 bento-card p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-6">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <span>Tren Arus Kas Harian (Pulse Wave)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Komparasi gelombang pengeluaran vs pemasukan harian
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold self-start sm:self-auto">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
                  <span>Pengeluaran</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm" />
                  <span>Pemasukan</span>
                </div>
              </div>
            </div>

            {analytics?.dailyTrends && analytics.dailyTrends.length > 0 ? (
              <DailyTrendChart data={analytics.dailyTrends} isDark={isDarkMode} />
            ) : (
              <div className="h-56 sm:h-72 flex items-center justify-center text-xs text-slate-400 italic">
                Data grafik tren sedang disiapkan...
              </div>
            )}
          </div>

          {/* 2. PAGU ANGGARAN (BUDGET): (order-3 lg:order-2 lg:col-span-1) */}
          <div className="order-3 lg:order-2 lg:col-span-1 bento-card p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-white/10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Pagu Anggaran (Budget)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Target vs realisasi bulan {currentMonthName}
                </p>
              </div>
            </div>
            <BudgetProgressCard
              comparisons={analytics?.budgetComparisons || []}
            />
          </div>

          {/* 3. RIWAYAT TRANSAKSI TERAKHIR: (order-4 lg:order-3 lg:col-span-3) */}
          <div className="order-4 lg:order-3 lg:col-span-3 bento-card p-4 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-white/10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-500" />
                  <span>Riwayat Transaksi Terakhir</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                  Catatan transaksi real-time tervalidasi dengan filter interaktif
                </p>
              </div>
            </div>

            {/* Interactive Transaction Filter Bar */}
            <TransactionFilterBar
              filters={filters}
              onFilterChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
              onResetFilters={() =>
                setFilters({
                  search: "",
                  type: "ALL",
                  walletId: "",
                  categoryId: "",
                  hasReceiptOnly: false,
                  sortBy: "date_desc",
                })
              }
              wallets={wallets}
              categories={categories}
              totalShowing={transactions.length}
            />

            {transactions.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <p>Tidak ada transaksi yang cocok dengan kriteria filter.</p>
                <button
                  onClick={() =>
                    setFilters({
                      search: "",
                      type: "ALL",
                      walletId: "",
                      categoryId: "",
                      hasReceiptOnly: false,
                      sortBy: "date_desc",
                    })
                  }
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-sm inline-block"
                >
                  Bersihkan Filter
                </button>
              </div>
            ) : (
              <>
                {/* Mobile View: Transaction Cards Feed */}
                <div className="sm:hidden space-y-2">
                  {transactions.map((tx) => {
                    const isExp = tx.type === "EXPENSE";
                    const formattedDate = new Date(tx.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    });

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#121826]/90 border border-slate-200/80 dark:border-white/10 hover:border-violet-500/40 transition flex items-center justify-between gap-2 shadow-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                              {tx.merchantName || (isExp ? "Pengeluaran" : "Pemasukan")}
                            </p>
                            {tx.receiptImageUrl && (
                              <button
                                onClick={() => setSelectedReceiptImage(tx.receiptImageUrl)}
                                className="text-cyan-500 hover:text-cyan-400 p-0.5 rounded"
                                title="Lihat Struk"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                            <span>{formattedDate}</span>
                            <span>•</span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{tx.wallet.name}</span>
                          </div>
                          {tx.category && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shadow-sm"
                                  style={{ backgroundColor: tx.category.color }}
                                />
                                {tx.category.name}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-xl font-black text-xs tracking-tight ${
                              isExp
                                ? "text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                            }`}
                          >
                            {isExp ? "-" : "+"}Rp {Number(tx.amount).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Full Table */}
                <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                        <th className="pb-3.5 pl-3">Tanggal & Toko</th>
                        <th className="pb-3.5">Kategori</th>
                        <th className="pb-3.5">Dompet</th>
                        <th className="pb-3.5">Struk AI</th>
                        <th className="pb-3.5 text-right pr-3">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                      {transactions.map((tx) => {
                        const isExp = tx.type === "EXPENSE";
                        const formattedDate = new Date(tx.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        });

                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors duration-150 group"
                          >
                            <td className="py-3.5 pl-3 pr-2">
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {tx.merchantName || (isExp ? "Pengeluaran" : "Pemasukan")}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {formattedDate} {tx.notes ? `• ${tx.notes}` : ""}
                              </p>
                            </td>
                            <td className="py-3.5 pr-2">
                              {tx.category ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300">
                                  <span
                                    className="w-2 h-2 rounded-full shadow-sm"
                                    style={{ backgroundColor: tx.category.color }}
                                  />
                                  {tx.category.name}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 text-[10px]">-</span>
                              )}
                            </td>
                            <td className="py-3.5 pr-2 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                              {tx.wallet.name}
                            </td>
                            <td className="py-3.5 pr-2">
                              {tx.receiptImageUrl ? (
                                <button
                                  onClick={() => setSelectedReceiptImage(tx.receiptImageUrl)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-xl border border-cyan-500/25 transition shadow-sm"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Lihat</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 text-[10px]">-</span>
                              )}
                            </td>
                            <td className="py-3.5 text-right pr-3 font-bold text-xs whitespace-nowrap">
                              <span
                                className={`inline-block px-3 py-1 rounded-xl font-black ${
                                  isExp
                                    ? "text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                    : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                }`}
                              >
                                {isExp ? "-" : "+"}Rp {Number(tx.amount).toLocaleString("id-ID")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal: Receipt OCR Scanner & Form Review */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        wallets={wallets}
        categories={categories}
        onTransactionSaved={fetchData}
      />

      {/* Modal: Manual Transaction Entry */}
      <ManualTransactionModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        wallets={wallets}
        categories={categories}
        onTransactionSaved={fetchData}
      />

      {/* Modal: Wallet Management (Add & Remove Wallets) */}
      <WalletManagementModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        wallets={wallets}
        onWalletUpdated={fetchData}
      />

      {/* Modal: Receipt Image Viewer */}
      {selectedReceiptImage && (
        <div
          onClick={() => setSelectedReceiptImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-xl max-h-[90vh] bg-white dark:bg-[#121826] rounded-3xl p-5 overflow-hidden shadow-2xl relative border border-slate-200 dark:border-white/10"
          >
            <img
              src={selectedReceiptImage}
              alt="Lampiran Struk"
              className="max-h-[72vh] sm:max-h-[75vh] w-auto max-w-full mx-auto rounded-2xl object-contain shadow-sm border border-slate-100 dark:border-white/5"
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => setSelectedReceiptImage(null)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg transition"
              >
                Tutup Gambar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
