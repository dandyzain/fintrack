"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <Sonner
      theme={(resolvedTheme as "light" | "dark") ?? "system"}
      position={isDesktop ? "bottom-right" : "top-center"}
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group !rounded-2xl !border !border-line !bg-surface-1 !text-fg !shadow-elev-3 !font-sans",
          description: "!text-fg-muted",
          actionButton: "!bg-brand !text-brand-contrast !rounded-lg !font-semibold",
          cancelButton: "!bg-surface-2 !text-fg",
          closeButton: "!bg-surface-1 !border-line !text-fg-muted",
        },
      }}
    />
  );
}
