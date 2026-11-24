"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inputs use 16px text on touch devices so iOS Safari never zooms on focus,
 * and 14px on desktop.
 */
export const controlBase = cn(
  "w-full rounded-xl border border-line bg-surface-1 px-3.5 text-base text-fg sm:text-sm",
  "h-11 coarse:h-12",
  "placeholder:text-fg-subtle",
  "transition-[border-color,box-shadow,background-color] duration-base ease-standard",
  "hover:border-line-strong",
  "focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15",
  "aria-[invalid=true]:border-negative aria-[invalid=true]:ring-negative/15",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

interface FieldContext {
  id: string;
  hintId?: string;
  errorId?: string;
  invalid: boolean;
}

const FieldCtx = React.createContext<FieldContext | null>(null);

export function useFieldProps() {
  const ctx = React.useContext(FieldCtx);
  if (!ctx) return {};
  const describedBy = [ctx.hintId, ctx.errorId].filter(Boolean).join(" ") || undefined;
  return {
    id: ctx.id,
    "aria-describedby": describedBy,
    "aria-invalid": ctx.invalid || undefined,
  } as const;
}

interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  optional?: string;
  badge?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
  srOnlyLabel?: boolean;
  id?: string;
}

export function Field({
  label,
  hint,
  error,
  optional,
  badge,
  className,
  labelClassName,
  srOnlyLabel,
  children,
  id: idProp,
}: FieldProps) {
  const autoId = React.useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <FieldCtx.Provider value={{ id, hintId, errorId, invalid: Boolean(error) }}>
      <div className={cn("space-y-1.5", className)}>
        <div className={cn("flex items-center justify-between gap-2", srOnlyLabel && "sr-only")}>
          <label htmlFor={id} className={cn("text-sm font-medium text-fg", labelClassName)}>
            {label}
            {optional && <span className="ml-1 font-normal text-fg-subtle">({optional})</span>}
          </label>
          {badge}
        </div>
        {children}
        {hint && !error && (
          <p id={hintId} className="text-xs text-fg-subtle">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-negative-fg">
            {error}
          </p>
        )}
      </div>
    </FieldCtx.Provider>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const field = useFieldProps();
    return <input ref={ref} className={cn(controlBase, className)} {...field} {...props} />;
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    const field = useFieldProps();
    return (
      <textarea
        ref={ref}
        className={cn(controlBase, "h-auto min-h-[88px] py-2.5 coarse:h-auto", className)}
        {...field}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

/** Native select (best mobile UX + accessibility), styled to match. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { leadingIcon?: React.ReactNode; wrapperClassName?: string }
>(({ className, leadingIcon, wrapperClassName, children, ...props }, ref) => {
  const field = useFieldProps();
  return (
    <div className={cn("relative", wrapperClassName)}>
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle [&_svg]:size-4">
          {leadingIcon}
        </span>
      )}
      <select
        ref={ref}
        className={cn(controlBase, "cursor-pointer appearance-none truncate pr-9", leadingIcon && "pl-9", className)}
        {...field}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  );
});
Select.displayName = "Select";
