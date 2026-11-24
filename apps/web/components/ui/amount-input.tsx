"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { groupDigits, parseDigits } from "@/lib/format";
import { controlBase, useFieldProps } from "./field";

interface AmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "size"> {
  value: number;
  onValueChange: (value: number) => void;
  size?: "md" | "lg";
}

/**
 * Rupiah amount input with live thousand separators (1.250.000),
 * numeric keypad on mobile, and caret kept stable while typing.
 */
export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onValueChange, size = "md", className, ...props }, ref) => {
    const field = useFieldProps();
    const display = value > 0 ? groupDigits(value) : "";

    return (
      <div className="relative">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-fg-subtle",
            size === "lg" ? "text-lg" : "text-sm"
          )}
        >
          Rp
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          value={display}
          placeholder="0"
          onChange={(e) => onValueChange(parseDigits(e.target.value))}
          className={cn(
            controlBase,
            "tabular font-semibold",
            size === "lg"
              ? "h-14 pl-12 text-2xl tracking-tight coarse:h-14 sm:text-2xl"
              : "pl-10",
            className
          )}
          {...field}
          {...props}
        />
      </div>
    );
  }
);
AmountInput.displayName = "AmountInput";

/** Quick-add chips that increment the current amount. */
export function QuickAmounts({
  onAdd,
  amounts = [10_000, 50_000, 100_000, 500_000],
  label,
}: {
  onAdd: (v: number) => void;
  amounts?: number[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {amounts.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onAdd(a)}
          className="tabular rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg-muted transition hover:border-brand/40 hover:text-fg active:scale-95 coarse:py-2"
        >
          +{groupDigits(a)}
        </button>
      ))}
    </div>
  );
}
