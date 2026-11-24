"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { usePeriod } from "@/context/period-context";
import { useLanguage } from "@/context/language-context";
import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

export function PeriodSwitcher({ className }: { className?: string }) {
  const { month, year, shift, reset, isCurrent } = usePeriod();
  const { t, language } = useLanguage();
  const label = formatMonth(month, year, language);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div
        role="group"
        aria-label={t.period.label}
        className="flex h-10 items-center rounded-xl border border-line bg-surface-1 p-0.5 shadow-elev-1 coarse:h-11"
      >
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label={t.period.previous}
          className="grid h-full w-9 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-2 hover:text-fg coarse:w-10"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <div aria-live="polite" aria-atomic="true" className="relative flex min-w-[9.5rem] items-center justify-center gap-1.5 overflow-hidden px-1 sm:min-w-[10.5rem]">
          <CalendarDays className="size-4 shrink-0 text-brand-fg" aria-hidden />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="whitespace-nowrap text-sm font-semibold capitalize text-fg"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label={t.period.next}
          className="grid h-full w-9 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-2 hover:text-fg coarse:w-10"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      {!isCurrent && (
        <Tooltip content={t.period.current}>
          <button
            type="button"
            onClick={reset}
            aria-label={t.period.current}
            className="grid size-10 place-items-center rounded-xl text-fg-subtle transition hover:bg-surface-2 hover:text-fg coarse:size-11"
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
