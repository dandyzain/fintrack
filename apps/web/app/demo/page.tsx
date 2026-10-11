"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  CreditCard,
  ShieldCheck,
  Receipt,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { LanguageSwitcher } from "@/components/common/language-switcher";

export default function DemoPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
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

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dandy@example.com",
          password: "password123",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal masuk ke akun demo.");
      }

      window.location.href = "/";
    } catch (err) {
      setErrorMsg((err as Error).message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#090D16] text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-hidden">
      {/* Background Decorative Ambient Neon Glows */}
      <div className="pointer-events-none absolute -top-32 left-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 w-96 h-96 bg-violet-600/10 dark:bg-violet-600/20 rounded-full blur-3xl" />

      {/* Top Bar Navigation & Language / Theme Switcher */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-20">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-[#121826]/80 border border-slate-200/80 dark:border-white/10 rounded-xl transition shadow-sm backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.auth.backToLogin}</span>
        </Link>
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <button
          onClick={toggleDarkMode}
          aria-label={t.nav.toggleTheme}
          title={isDarkMode ? t.nav.themeLight : t.nav.themeDark}
          className="p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#121826]/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1B2337] transition shadow-sm backdrop-blur-md"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-violet-600" />
          )}
        </button>
      </div>

      {/* Main Demo Container */}
      <div className="w-full max-w-lg relative z-10 my-8">
        <div className="bento-card p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-xl backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-3">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-2xl blur-sm opacity-60" />
              <img
                src="/logo.png"
                alt="FinTrack Logo"
                className="relative w-14 h-14 mx-auto rounded-2xl shadow-md object-cover border border-white/20"
              />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t.demo.demoTitle}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)] flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Interactive
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              {t.demo.demoSubtitle}
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Demo Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
            <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/5 text-center">
              <div className="w-7 h-7 mx-auto mb-1.5 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Virtual Cards</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Multi wallet balance</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/5 text-center">
              <div className="w-7 h-7 mx-auto mb-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Vision OCR AI</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Receipt scanner</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/5 text-center">
              <div className="w-7 h-7 mx-auto mb-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Health Meter</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Savings ratio score</p>
            </div>
          </div>

          {/* Preset Profile Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/5 to-cyan-500/5 dark:from-violet-600/10 dark:to-cyan-500/10 border border-violet-500/20 mb-6">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                {t.demo.sandboxProfile}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                Ready to Test
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  Dandy Rahmat Zain
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  dandy@example.com
                </p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                password123
              </span>
            </div>
          </div>

          {/* 1-Click Launch Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-4 glow-btn-cyan text-white text-xs sm:text-sm font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.demo.preparingDemo}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>{t.demo.enterDemoBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Navigation Options */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <Link
              href="/login"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium"
            >
              {t.demo.hasPersonalAccount} <span className="font-bold text-violet-600 dark:text-violet-400">{t.auth.signInBtn}</span>
            </Link>
            <Link
              href="/register"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium"
            >
              {t.demo.registerNewAccount}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
