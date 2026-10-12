"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyExpenseTrend } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";

interface DailyTrendChartProps {
  data: DailyExpenseTrend[];
  isDark?: boolean;
}

export function DailyTrendChart({ data, isDark = false }: DailyTrendChartProps) {
  const { language } = useLanguage();
  const isId = language === "id";
  const labels = {
    date: isId ? "Tanggal" : "Day",
    cashflow: isId ? "Arus Kas" : "Cashflow",
    expense: isId ? "Pengeluaran" : "Expense",
    income: isId ? "Pemasukan" : "Income",
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      const millions = val / 1000000;
      const num = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
      return isId ? `${num}jt` : `${num}M`;
    }
    if (val >= 1000) return isId ? `${(val / 1000).toFixed(0)}rb` : `${(val / 1000).toFixed(0)}K`;
    return `${val}`;
  };

  const tickColor = isDark ? "#818CF8" : "#64748B";
  const gridColor = isDark ? "rgba(99, 102, 241, 0.08)" : "#F1F5F9";

  return (
    <div className="w-full h-56 sm:h-80 relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <defs>
            {/* Creative Modern: Cyber Glow Filters */}
            <filter id="neonGlowViolet" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8B5CF6" floodOpacity="0.4" />
            </filter>
            <filter id="neonGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#06B6D4" floodOpacity="0.4" />
            </filter>

            {/* Neon Rose / Violet Gradient for Expenses */}
            <linearGradient id="creativeExpenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity={isDark ? 0.35 : 0.22} />
              <stop offset="60%" stopColor="#8B5CF6" stopOpacity={isDark ? 0.12 : 0.08} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.0} />
            </linearGradient>

            {/* Neon Cyan / Emerald Gradient for Incomes */}
            <linearGradient id="creativeIncomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={isDark ? 0.38 : 0.25} />
              <stop offset="60%" stopColor="#10B981" stopOpacity={isDark ? 0.15 : 0.08} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="4 4"
            vertical={false}
            stroke={gridColor}
          />

          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
            tick={{ fill: tickColor, fontSize: 11, fontWeight: 600 }}
            tickFormatter={(day) => `${day}`}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: tickColor, fontSize: 11, fontWeight: 600 }}
            tickFormatter={formatCurrency}
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const expense = (payload[0]?.value as number) || 0;
                const income = (payload[1]?.value as number) || 0;
                return (
                  <div className="bg-white/95 dark:bg-[#121826]/95 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl shadow-xl border border-slate-200/90 dark:border-indigo-500/30 text-xs max-w-[220px]">
                    <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-800 dark:text-white">
                        {labels.date} {label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/50 dark:border-indigo-800/50">
                        {labels.cashflow}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-0.5 text-rose-600 dark:text-rose-400 font-bold">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" /> {labels.expense}
                      </span>
                      <span>Rp {expense.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm" /> {labels.income}
                      </span>
                      <span>Rp {income.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Area
            type="natural"
            dataKey="expenseAmount"
            stroke="#F43F5E"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#creativeExpenseGradient)"
            name={labels.expense}
            dot={false}
            activeDot={{
              r: 6,
              fill: "#F43F5E",
              stroke: isDark ? "#121826" : "#FFFFFF",
              strokeWidth: 2.5,
            }}
          />

          <Area
            type="natural"
            dataKey="incomeAmount"
            stroke="#06B6D4"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#creativeIncomeGradient)"
            name={labels.income}
            dot={false}
            activeDot={{
              r: 6,
              fill: "#06B6D4",
              stroke: isDark ? "#121826" : "#FFFFFF",
              strokeWidth: 2.5,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
