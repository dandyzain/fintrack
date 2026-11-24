"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Tailwind classes applied to the sliding pill when this option is active. */
  activeClassName?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
  block?: boolean;
}

/**
 * Radio-group semantics with a sliding active pill (shared layout animation).
 * Arrow keys move selection, matching native radio behaviour.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
  block = false,
}: SegmentedControlProps<T>) {
  const groupId = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative inline-flex rounded-xl border border-line bg-surface-2 p-1",
        block && "flex w-full",
        className
      )}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative z-0 inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors duration-base",
              size === "sm" ? "h-8 px-3 text-xs coarse:h-10" : "h-9 px-4 text-sm coarse:h-11",
              active ? "text-fg" : "text-fg-subtle hover:text-fg"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${groupId}`}
                transition={spring.snappy}
                aria-hidden
                className={cn("absolute inset-0 -z-10 rounded-lg bg-surface-1 shadow-elev-1", opt.activeClassName)}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
