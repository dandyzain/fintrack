"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Real month-over-month change. `goodWhen` decides the color: spending going
 * down is good, income going up is good.
 */
export function DeltaChip({
  change,
  goodWhen,
  className,
}: {
  change: number | null;
  goodWhen: "up" | "down";
  className?: string;
}) {
  const { t, language } = useLanguage();
  if (change === null) {
    return <span className={cn("text-xs text-fg-subtle", className)}>{t.overview.noComparison}</span>;
  }
  const flat = Math.abs(change) < 0.5;
  const up = change > 0;
  const good = flat ? null : goodWhen === "up" ? up : !up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <span
        className={cn(
          "tabular inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
          good === null && "bg-surface-2 text-fg-muted",
          good === true && "bg-positive/10 text-positive-fg",
          good === false && "bg-negative/10 text-negative-fg"
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {formatPercent(Math.abs(change), language, Math.abs(change) < 10 ? 1 : 0)}
      </span>
      <span className="text-fg-subtle">{t.overview.vsLastMonth}</span>
    </span>
  );
}
