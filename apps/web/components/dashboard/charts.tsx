"use client";

/**
 * Recharts visualisations. This module is loaded with next/dynamic so the
 * charting library stays out of the initial JavaScript bundle.
 */
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import { useReducedMotion } from "framer-motion";
import type { CategorySpendingBreakdown, DailyExpenseTrend } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { usePrivacy } from "@/context/privacy-context";
import { fmt, localizeCategoryName } from "@/lib/i18n/translations";
import { formatCompact, formatIDR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const palette = {
  light: { income: "#10B981", expense: "#F43F5E", grid: "#E6E9F1", tick: "#646B82", cursor: "#CBD0DD", surface: "#FFFFFF" },
  dark: { income: "#34D399", expense: "#FB7185", grid: "#212940", tick: "#868FA9", cursor: "#323D5A", surface: "#0E1320" },
};

export function CashflowChart({ data }: { data: DailyExpenseTrend[] }) {
  const { resolvedTheme } = useTheme();
  const { t, language } = useLanguage();
  const { hidden } = usePrivacy();
  const reduce = useReducedMotion();
  const c = palette[resolvedTheme === "dark" ? "dark" : "light"];

  return (
    <div className="h-60 w-full sm:h-72" role="img" aria-label={t.overview.cashflow.title}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="cf-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.income} stopOpacity={0.32} />
              <stop offset="100%" stopColor={c.income} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cf-expense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.expense} stopOpacity={0.28} />
              <stop offset="100%" stopColor={c.expense} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 5" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
            tick={{ fill: c.tick, fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: c.tick, fontSize: 12 }}
            tickFormatter={(v: number) => (hidden ? "•••" : formatCompact(v, language))}
          />
          <Tooltip
            cursor={{ stroke: c.cursor, strokeWidth: 1.5, strokeDasharray: "4 4" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const income = Number(payload.find((p) => p.dataKey === "incomeAmount")?.value ?? 0);
              const expense = Number(payload.find((p) => p.dataKey === "expenseAmount")?.value ?? 0);
              return (
                <div className="min-w-[180px] rounded-xl border border-line bg-surface-1/95 p-3 text-sm shadow-elev-3 backdrop-blur">
                  <p className="mb-2 font-semibold text-fg">{fmt(t.overview.cashflow.day, { day: String(label) })}</p>
                  <Row color={c.income} label={t.overview.income} value={hidden ? "•••" : formatIDR(income, { lang: language })} />
                  <Row color={c.expense} label={t.overview.expense} value={hidden ? "•••" : formatIDR(expense, { lang: language })} />
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="incomeAmount"
            stroke={c.income}
            strokeWidth={2.25}
            fill="url(#cf-income)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2.5, stroke: c.surface, fill: c.income }}
            isAnimationActive={!reduce}
            animationDuration={900}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="expenseAmount"
            stroke={c.expense}
            strokeWidth={2.25}
            fill="url(#cf-expense)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2.5, stroke: c.surface, fill: c.expense }}
            isAnimationActive={!reduce}
            animationDuration={900}
            animationBegin={120}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-2 text-fg-muted">
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="tabular font-semibold text-fg">{value}</span>
    </div>
  );
}

export function CategoryDonut({
  data,
  total,
  onSelect,
}: {
  data: CategorySpendingBreakdown[];
  total: number;
  onSelect?: (categoryId: string) => void;
}) {
  const { t, language } = useLanguage();
  const { hidden } = usePrivacy();
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const focus = active !== null ? data[active] : null;

  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-5 @md:flex-row @md:items-center">
      {/* Decorative: the legend list next to it carries the same data accessibly */}
      <div className="relative size-44 shrink-0" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="totalAmount"
              nameKey="categoryName"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 2.5 : 0}
              cornerRadius={6}
              stroke="none"
              rootTabIndex={-1}
              isAnimationActive={!reduce}
              animationDuration={800}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={(d: CategorySpendingBreakdown) => onSelect?.(d.categoryId)}
              className={cn(onSelect && "cursor-pointer")}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.categoryId}
                  fill={d.categoryColor || "#8B5CF6"}
                  opacity={active === null || active === i ? 1 : 0.35}
                  style={{ transition: "opacity 200ms" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="max-w-[7rem] truncate text-xs text-fg-subtle">
              {focus ? localizeCategoryName(focus.categoryName, language) : t.overview.expense}
            </p>
            <p className={cn("tabular text-lg font-bold tracking-tight text-fg", hidden && "blur-[6px]")}>
              {formatIDR(focus ? focus.totalAmount : total, { compact: true, lang: language })}
            </p>
            {focus && <p className="tabular text-xs font-semibold text-fg-muted">{formatPercent(focus.percentage, language, 1)}</p>}
          </div>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1">
        {data.slice(0, 5).map((d, i) => (
          <li key={d.categoryId}>
            <button
              type="button"
              onClick={() => onSelect?.(d.categoryId)}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-surface-2"
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.categoryColor }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                {localizeCategoryName(d.categoryName, language)}
                <span className="ml-1.5 text-xs font-normal text-fg-subtle">
                  {fmt(t.overview.categories.count, { count: d.transactionCount })}
                </span>
              </span>
              <span className="text-right">
                <span className={cn("tabular block text-sm font-semibold text-fg", hidden && "blur-[6px]")}>
                  {formatIDR(d.totalAmount, { compact: true, lang: language })}
                </span>
                <span className="tabular block text-xs text-fg-subtle">{formatPercent(d.percentage, language, 1)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
