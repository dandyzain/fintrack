"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-base ease-standard",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-contrast shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] hover:shadow-glow-brand hover:brightness-110",
        ai: "bg-gradient-to-br from-ai to-[#38BDF8] text-ai-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:shadow-glow-ai hover:brightness-105",
        secondary: "bg-surface-2 text-fg hover:bg-surface-3",
        outline: "border border-line bg-surface-1 text-fg hover:border-line-strong hover:bg-surface-2",
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
        danger: "bg-[#E11D48] text-white hover:bg-[#BE123C]",
        "danger-ghost": "text-negative-fg hover:bg-negative/10",
        link: "h-auto px-0 text-brand-fg underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-9 px-3 text-sm coarse:h-10",
        md: "h-10 px-4 text-sm coarse:h-11",
        lg: "h-12 px-6 text-base",
        icon: "size-10 coarse:size-11",
        "icon-sm": "size-8 rounded-lg coarse:size-10",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, loading = false, disabled, children, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        // Default to type="button" so swapping buttons never triggers an accidental submit.
        type={asChild ? undefined : type ?? "button"}
        className={cn(buttonVariants({ variant, size, block }), className)}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";
