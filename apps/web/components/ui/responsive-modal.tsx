"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { Dialog, DialogContent, SheetContent } from "./dialog";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  closeLabel: string;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  /** Layout on ≥768px: centered dialog or right-side sheet. Phones always get a bottom drawer. */
  variant?: "dialog" | "sheet";
  size?: "sm" | "md" | "lg" | "xl";
  bodyClassName?: string;
  /** Drawer takes nearly the full screen height on phones. */
  tall?: boolean;
  /** Block dismissal (e.g. while saving). */
  dismissible?: boolean;
}

/**
 * One API, three presentations: dialog / side sheet on larger screens and a
 * draggable bottom drawer on phones. All variants trap focus, close on Esc,
 * and restore focus to the trigger (Radix).
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  closeLabel,
  footer,
  headerExtra,
  children,
  variant = "dialog",
  size = "md",
  bodyClassName,
  tall = false,
  dismissible = true,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleOpenChange = (next: boolean) => {
    if (!next && !dismissible) return;
    onOpenChange(next);
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {variant === "sheet" ? (
          <SheetContent
            title={title}
            description={description}
            icon={icon}
            closeLabel={closeLabel}
            footer={footer}
            headerExtra={headerExtra}
            bodyClassName={bodyClassName}
          >
            {children}
          </SheetContent>
        ) : (
          <DialogContent
            size={size}
            title={title}
            description={description}
            icon={icon}
            closeLabel={closeLabel}
            footer={footer}
            headerExtra={headerExtra}
            bodyClassName={bodyClassName}
          >
            {children}
          </DialogContent>
        )}
      </Dialog>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange} dismissible={dismissible} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[rgb(3_6_14/0.55)] backdrop-blur-sm" />
        <Drawer.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[1.75rem] border-t border-line bg-surface-1 shadow-elev-3 focus:outline-none",
            tall ? "h-[94dvh]" : "max-h-[92dvh]"
          )}
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-line-strong" />
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
            <div className="flex min-w-0 items-start gap-3">
              {icon && (
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5">
                  {icon}
                </span>
              )}
              <div className="min-w-0">
                <Drawer.Title className="text-lg font-semibold tracking-tight text-fg">{title}</Drawer.Title>
                {description ? (
                  <Drawer.Description className="mt-0.5 text-sm text-fg-subtle">{description}</Drawer.Description>
                ) : null}
                {headerExtra}
              </div>
            </div>
            <Drawer.Close
              aria-label={closeLabel}
              className="-mr-2 grid size-11 shrink-0 place-items-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-5" aria-hidden />
            </Drawer.Close>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5", bodyClassName)}>
            {children}
          </div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
