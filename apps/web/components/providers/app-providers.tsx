"use client";

import React, { useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { LanguageProvider } from "@/context/language-context";
import { Toaster } from "@/components/ui/toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      storageKey="fintrack-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          {/* Honors the OS "reduce motion" setting for every framer-motion animation */}
          <MotionConfig reducedMotion="user">
            <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={150}>
              {children}
              <Toaster />
            </TooltipPrimitive.Provider>
          </MotionConfig>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
