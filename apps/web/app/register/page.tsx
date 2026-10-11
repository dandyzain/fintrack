"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Sparkles,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: "Lemah", color: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" };
    if (score === 2) return { score: 2, label: "Cukup", color: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" };
    if (score === 3) return { score: 3, label: "Kuat", color: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" };
    return { score: 4, label: "Sangat Kuat", color: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg("Nama lengkap wajib diisi.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Alamat email wajib diisi.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Kata sandi minimal harus 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mendaftar akun baru.");
      }

      // Automatically redirect to dashboard
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
              Daftar akun gratis & mulai lacak keuangan Anda
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Lengkap Anda"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter..."
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

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Kekuatan Sandi:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          step <= strength.score ? strength.color : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi..."
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 glow-btn-violet text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mendaftarkan Akun...</span>
                </>
              ) : (
                <>
                  <span>Buat Akun FinTrack</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Sudah memiliki akun? </span>
            <Link
              href="/login"
              className="font-bold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Masuk di sini →
            </Link>
          </div>
        </div>

        {/* Footer Copyright Notice */}
        <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1.5">
          <p className="font-medium">
            © 2026 <span className="font-bold text-slate-700 dark:text-slate-300">FinTrack AI</span>. All rights reserved.
          </p>
          <p className="flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span>Crafted with</span>
            <span className="text-rose-500 inline-block animate-pulse">❤️</span>
            <span>by</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">Dandy Rahmat Zain</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
