"use client";

import React from "react";
import { useLanguage } from "@/context/language-context";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  className?: string;
  showIcon?: boolean;
}

export function LanguageSwitcher({
  className = "",
  showIcon = true,
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-0.5 sm:p-1 bg-white/80 dark:bg-[#121826]/80 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md ${className}`}
      role="group"
      aria-label="Language Selector"
    >
      {showIcon && (
        <span className="hidden sm:inline-flex px-1.5 text-slate-400 dark:text-slate-500">
          <Globe className="w-3.5 h-3.5" />
        </span>
      )}
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-label="Switch to English"
        className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
          language === "en"
            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <span className="text-[11px]">🇬🇧</span>
        <span>EN</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage("id")}
        aria-label="Beralih ke Bahasa Indonesia"
        className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
          language === "id"
            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <span className="text-[11px]">🇮🇩</span>
        <span>ID</span>
      </button>
    </div>
  );
}
