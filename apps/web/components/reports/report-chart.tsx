"use client";

/**
 * Income vs. spending per month (grouped bars, one shared IDR axis).
 * Loaded with next/dynamic so Recharts stays out of the initial bundle.
 *
 * Colours: blue = income, orange = spending (validated colour-blind safe in
 * both themes: CVD ΔE ≈ 27). Identity is never colour-alone: legend above,
 * values in the tooltip, and the full numbers in the table below the chart.
 */
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import type { MonthlyReportPoint } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { usePrivacy } from "@/context/privacy-context";
import { formatCompact, formatIDR, formatMonth } from "@/lib/format";
import { useReportColors } from "./report-colors";

export function MonthlyBars({ data }: { data: MonthlyReportPoint[] }) {
  const { t, language } = useLanguage();
  const { hidden } = usePrivacy();
  const reduce = useReducedMotion();
  const c = useReportColors();
  const label = (p: MonthlyReportPoint) => formatMonth(p.month, p.year, language, "short");
  const money = (v: number) => (hidden ? "•••" : formatIDR(v, { lang: language }));

  return (
    <div className="h-64 w-full sm:h-72" role="img" aria-label={`${t.reportsPage.monthlyTitle}: ${t.reportsPage.income}, ${t.reportsPage.expense}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 5" />
          <XAxis
            dataKey="key"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={8}
            tick={{ fill: c.tick, fontSize: 12 }}
            tickFormatter={(_: string, i: number) => (data[i] ? label(data[i]) : "")}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: c.tick, fontSize: 12 }}
            tickFormatter={(v: number) => (hidden ? "•••" : formatCompact(v, language))}
          />
          <Tooltip
            cursor={{ fill: c.cursor, radius: 8 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as MonthlyReportPoint | undefined;
              if (!active || !p) return null;
              return (
                <div className="min-w-[200px] rounded-xl border border-line bg-surface-1/95 p-3 text-sm shadow-elev-3 backdrop-blur">
                  <p className="mb-2 font-semibold text-fg">{formatMonth(p.month, p.year, language)}</p>
                  <TooltipRow color={c.income} label={t.reportsPage.income} value={money(p.income)} />
                  <TooltipRow color={c.expense} label={t.reportsPage.expense} value={money(p.expense)} />
                  <div className="mt-1.5 border-t border-line pt-1.5">
                    <TooltipRow label={t.reportsPage.net} value={money(p.net)} />
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="income" name={t.reportsPage.income} fill={c.income} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={!reduce} />
          <Bar dataKey="expense" name={t.reportsPage.expense} fill={c.expense} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={!reduce} animationBegin={120} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TooltipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-2 text-fg-muted">
        {color ? <span className="size-2 rounded-full" style={{ backgroundColor: color }} /> : <span className="size-2" />}
        {label}
      </span>
      <span className="tabular font-semibold text-fg">{value}</span>
    </div>
  );
}
