import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-2 text-fg-muted",
        brand: "border-brand/25 bg-brand/10 text-brand-fg",
        ai: "border-ai/30 bg-ai/10 text-ai-fg",
        positive: "border-positive/30 bg-positive/10 text-positive-fg",
        negative: "border-negative/30 bg-negative/10 text-negative-fg",
        warning: "border-warning/35 bg-warning/10 text-warning-fg",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Small colored dot used for categories. */
export function ColorDot({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full ring-2 ring-surface-1", className)}
      style={{ backgroundColor: color || "rgb(var(--fg-subtle))" }}
    />
  );
}
