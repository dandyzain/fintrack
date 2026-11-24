"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toDateInputValue } from "@/lib/format";

export interface Period {
  month: number; // 1-12
  year: number;
}

interface PeriodContextValue extends Period {
  setPeriod: (p: Period) => void;
  shift: (delta: number) => void;
  reset: () => void;
  isCurrent: boolean;
  isFuture: boolean;
  previous: Period;
  /** Inclusive date range for API filters (YYYY-MM-DD). */
  range: { startDate: string; endDate: string };
}

const KEY = "fintrack-period";
const now = () => {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
};

export function shiftPeriod(p: Period, delta: number): Period {
  const d = new Date(p.year, p.month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

/** The month being viewed — drives analytics and the transaction ledger. */
export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = useState<Period>(now);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) {
        const p = JSON.parse(saved) as Period;
        if (p.month >= 1 && p.month <= 12 && p.year > 2000) setPeriodState(p);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setPeriod = useCallback((p: Period) => {
    setPeriodState(p);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<PeriodContextValue>(() => {
    const current = now();
    const isCurrent = period.month === current.month && period.year === current.year;
    const isFuture = period.year > current.year || (period.year === current.year && period.month > current.month);
    const start = new Date(period.year, period.month - 1, 1);
    const end = new Date(period.year, period.month, 0);
    return {
      ...period,
      setPeriod,
      shift: (delta: number) => setPeriod(shiftPeriod(period, delta)),
      reset: () => setPeriod(now()),
      isCurrent,
      isFuture,
      previous: shiftPeriod(period, -1),
      range: { startDate: toDateInputValue(start), endDate: toDateInputValue(end) },
    };
  }, [period, setPeriod]);

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used inside PeriodProvider");
  return ctx;
}
