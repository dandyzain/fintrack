import { toDateInputValue } from "@/lib/format";

export interface Period {
  month: number; // 1-12
  year: number;
}

export function currentPeriod(d = new Date()): Period {
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function shiftPeriod(p: Period, delta: number): Period {
  const d = new Date(p.year, p.month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

/** Inclusive date range for API filters (YYYY-MM-DD). */
export function periodRange(p: Period) {
  return {
    startDate: toDateInputValue(new Date(p.year, p.month - 1, 1)),
    endDate: toDateInputValue(new Date(p.year, p.month, 0)),
  };
}

/** Query used by the overview's "Recent activity" list (shared by server prefetch and client). */
export const recentQuery = (p: Period) => ({ ...periodRange(p), limit: 6, sortBy: "date_desc" as const });
