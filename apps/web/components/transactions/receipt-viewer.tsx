"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { overlayClass } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Full-screen receipt lightbox. */
export function ReceiptViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  const { t } = useLanguage();
  return (
    <DialogPrimitive.Root open={Boolean(url)} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(overlayClass, "z-[60] bg-[rgb(3_6_14/0.85)]")} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[60] grid place-items-center p-4 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          onClick={onClose}
        >
          <DialogPrimitive.Title className="sr-only">{t.detail.receipt}</DialogPrimitive.Title>
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={t.detail.receipt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[86dvh] max-w-full rounded-2xl object-contain shadow-elev-3"
            />
          )}
          <DialogPrimitive.Close
            aria-label={t.common.close}
            className="fixed right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
