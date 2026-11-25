"use client";

import * as React from "react";
import * as AlertPrimitive from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  /** Extra controls (e.g. options) shown between the description and the buttons. */
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}

/** Accessible replacement for window.confirm (focus starts on Cancel). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = true,
  children,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        {/* No exit animation: the layer unmounts instantly so it can never swallow the next Escape. */}
        <AlertPrimitive.Overlay className="fixed inset-0 z-[60] bg-[rgb(3_6_14/0.55)] backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-line bg-surface-1 p-6 shadow-elev-3 focus:outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <div
            aria-hidden
            className={cn(
              "mb-4 grid size-11 place-items-center rounded-2xl",
              destructive ? "bg-negative/10 text-negative-fg" : "bg-brand/10 text-brand-fg"
            )}
          >
            <AlertTriangle className="size-5" />
          </div>
          <AlertPrimitive.Title className="text-lg font-semibold tracking-tight text-fg">{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description className="mt-2 text-sm leading-relaxed text-fg-muted">
            {description}
          </AlertPrimitive.Description>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertPrimitive.Cancel className={buttonVariants({ variant: "outline" })}>{cancelLabel}</AlertPrimitive.Cancel>
            <AlertPrimitive.Action
              className={buttonVariants({ variant: destructive ? "danger" : "primary" })}
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {confirmLabel}
            </AlertPrimitive.Action>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
