"use client";

import React from "react";
import { useLanguage } from "@/context/language-context";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={`Current language: ${language.toUpperCase()}. Click to toggle language`}
      title={language === "en" ? "Ganti ke Bahasa Indonesia (ID)" : "Switch to English (EN)"}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#121826]/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1B2337] hover:border-violet-500/40 transition shadow-sm backdrop-blur-md cursor-pointer select-none text-xs font-bold ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
      <span className="tracking-wider font-extrabold uppercase">{language}</span>
    </button>
  );
}

