"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Updates --mx/--my so `.spotlight` can draw a cursor-following border glow. */
export function useSpotlight<T extends HTMLElement>() {
  return React.useCallback((e: React.PointerEvent<T>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlight?: boolean;
  as?: "div" | "section" | "article";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, spotlight = false, as: Tag = "div", onPointerMove, ...props }, ref) => {
    const handleSpotlight = useSpotlight<HTMLDivElement>();
    return (
      <Tag
        ref={ref}
        className={cn("panel", spotlight && "spotlight", className)}
        onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
          if (spotlight) handleSpotlight(e);
          onPointerMove?.(e);
        }}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export function CardHeader({
  className,
  title,
  description,
  icon,
  action,
  titleAs: TitleTag = "h2",
  id,
}: {
  className?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  titleAs?: "h2" | "h3";
  id?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            aria-hidden
            className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-muted [&_svg]:size-4"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <TitleTag id={id} className="text-base font-semibold tracking-tight text-fg">
            {title}
          </TitleTag>
          {description && <p className="mt-0.5 text-sm text-fg-subtle">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
