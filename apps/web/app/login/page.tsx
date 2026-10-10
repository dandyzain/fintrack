"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Email dan kata sandi wajib diisi.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal masuk ke akun.");
      }

      // Login successful -> redirect to dashboard
      window.location.href = "/";
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Instant 1-Click Demo Login
  const handleDemoLogin = async () => {
    setEmail("dandy@example.com");
    setPassword("password123");
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
        throw new Error(json.error || "Gagal masuk akun demo.");
      }

      window.location.href = "/";
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#090D16] text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-hidden">
      {/* Background Decorative Ambient Neon Glows */}
      <div className="pointer-events-none absolute -top-32 left-1/4 w-96 h-96 bg-violet-600/10 dark:bg-violet-600/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-3xl" />

      {/* Top Bar Theme Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-20">
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle Theme"
          title={isDarkMode ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
          className="p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#121826]/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1B2337] transition shadow-sm backdrop-blur-md"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-violet-600" />
          )}
        </button>
      </div>

      {/* Main Creative Bento Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bento-card p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-xl backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="relative inline-block mb-3">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl blur-sm opacity-60" />
              <img
                src="/logo.png"
                alt="FinTrack Logo"
                className="relative w-12 h-12 mx-auto rounded-2xl shadow-md object-cover border border-white/20"
              />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                FinTrack
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-[0_0_8px_rgba(99,102,241,0.4)] flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Creative
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              Masuk untuk mengelola keuangan & analisis struk AI
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 glow-btn-violet text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-white/10" />
            </div>
            <span className="relative px-3 bg-white dark:bg-[#121826] text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              atau coba akun demo
            </span>
          </div>

          {/* 1-Click Instant Demo Login */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2 hover:border-violet-500/40"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
            <span>Masuk Instan (Akun Demo: Dandy Zain)</span>
          </button>

          {/* Register Link */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Belum memiliki akun? </span>
            <Link
              href="/register"
              className="font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Daftar sekarang →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
