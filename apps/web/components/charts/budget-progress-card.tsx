"use client";

import React from "react";
import type { CategoryBudgetComparison } from "@fintrack/shared";
import { AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";

interface BudgetProgressCardProps {
  comparisons: CategoryBudgetComparison[];
}

export function BudgetProgressCard({ comparisons }: BudgetProgressCardProps) {
  if (!comparisons || comparisons.length === 0) {
    return (
      <div className="text-xs text-slate-400 dark:text-slate-500 py-8 text-center italic bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
        Belum ada pagu anggaran atau pengeluaran tercatat untuk bulan ini.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comparisons.map((item) => {
        const isOver = item.isOverBudget;
        const percentClamped = Math.min(100, Math.round(item.percentageUsed));
        const isHigh = percentClamped > 80;

        return (
          <div
            key={item.categoryId}
            className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/80 hover:border-indigo-500/30 transition shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: item.categoryColor || "#6366F1" }}
                />
                <span className="font-bold text-slate-900 dark:text-white text-xs tracking-tight">
                  {item.categoryName}
                </span>
              </div>

              {/* Status Badge */}
              <div>
                {isOver ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    <AlertTriangle className="w-2.5 h-2.5" /> Pagu Terlampaui
                  </span>
                ) : isHigh ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <AlertCircle className="w-2.5 h-2.5" /> Waspada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Aman
                  </span>
                )}
              </div>
            </div>

            {/* Glowing Rounded Progress Bar */}
            <div className="w-full bg-slate-200/70 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOver
                    ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                    : isHigh
                    ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                    : "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                }`}
                style={{ width: `${percentClamped}%` }}
              />
            </div>

            <div className="flex flex-wrap justify-between items-center gap-1 mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200 text-[11px]">
                Rp {item.actualExpense.toLocaleString("id-ID")}{" "}
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                  / Rp {item.limitAmount.toLocaleString("id-ID")}
                </span>
              </span>
              <span className="text-[11px] font-bold ml-auto text-slate-700 dark:text-slate-300">
                {isOver
                  ? `+Rp ${(item.actualExpense - item.limitAmount).toLocaleString("id-ID")}`
                  : `Sisa Rp ${item.remainingBudget.toLocaleString("id-ID")}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
