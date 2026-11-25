"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export const overlayClass =
  "fixed inset-0 z-50 bg-[rgb(3_6_14/0.55)] backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:duration-200 data-[state=closed]:duration-150";

export function CloseButton({ label, className }: { label: string; className?: string }) {
  return (
    <DialogPrimitive.Close
      aria-label={label}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-2 hover:text-fg coarse:size-11",
        className
      )}
    >
      <X className="size-5" aria-hidden />
    </DialogPrimitive.Close>
  );
}

interface ModalChrome {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  closeLabel: string;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  hideHeader?: boolean;
  bodyClassName?: string;
}

export function ModalHeader({
  title,
  description,
  icon,
  closeLabel,
  headerExtra,
}: Pick<ModalChrome, "title" | "description" | "icon" | "closeLabel" | "headerExtra">) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-4 pt-5 sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-fg">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-0.5 text-sm text-fg-subtle">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          {headerExtra}
        </div>
      </div>
      <CloseButton label={closeLabel} className="-mr-2 -mt-1" />
    </div>
  );
}

const sizeClass = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function DialogContent({
  children,
  size = "md",
  className,
  title,
  description,
  icon,
  closeLabel,
  footer,
  headerExtra,
  hideHeader,
  bodyClassName,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> & ModalChrome & { size?: keyof typeof sizeClass }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[min(92dvh,900px)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
          "overflow-hidden rounded-3xl border border-line bg-surface-1 shadow-elev-3 focus:outline-none",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:slide-in-from-top-[46%] data-[state=open]:duration-300",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=closed]:duration-150",
          sizeClass[size],
          className
        )}
        {...props}
      >
        {hideHeader ? (
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        ) : (
          <ModalHeader title={title} description={description} icon={icon} closeLabel={closeLabel} headerExtra={headerExtra} />
        )}
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-2/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Right-side sheet for detail views on tablet/desktop. */
export function SheetContent({
  children,
  className,
  title,
  description,
  icon,
  closeLabel,
  footer,
  headerExtra,
  bodyClassName,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> & ModalChrome) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-line bg-surface-1 shadow-elev-3 focus:outline-none",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-300 data-[state=open]:ease-emphasized",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200",
          className
        )}
        {...props}
      >
        <ModalHeader title={title} description={description} icon={icon} closeLabel={closeLabel} headerExtra={headerExtra} />
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 pb-safe sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
