import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton", className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong/70 bg-surface-2/40 text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-10",
        className
      )}
    >
      <div aria-hidden className="relative">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-brand/10 blur-xl" />
        <div className="grid size-12 place-items-center rounded-2xl border border-line bg-surface-1 text-brand-fg shadow-elev-1 [&_svg]:size-5">
          {icon}
        </div>
      </div>
      <div className="max-w-xs space-y-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {description && <p className="text-sm text-fg-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function InlineAlert({
  children,
  tone = "negative",
  className,
}: {
  children: React.ReactNode;
  tone?: "negative" | "warning" | "ai";
  className?: string;
}) {
  const toneClass = {
    negative: "border-negative/30 bg-negative/10 text-negative-fg",
    warning: "border-warning/35 bg-warning/10 text-warning-fg",
    ai: "border-ai/30 bg-ai/10 text-ai-fg",
  }[tone];
  return (
    <div role="alert" className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm", toneClass, className)}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1.5 font-sans text-xs font-medium text-fg-subtle",
        className
      )}
    >
      {children}
    </kbd>
  );
}
