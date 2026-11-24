"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import { PrivacyProvider } from "@/context/privacy-context";
import { PeriodProvider } from "@/context/period-context";
import { AppActionsProvider, useAppActions } from "@/context/app-actions-context";
import { useMe } from "@/lib/api/queries";
import { useHotkeys } from "@/lib/hooks/use-hotkeys";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/feedback";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import { GlobalOverlays } from "./global-overlays";

const COLLAPSE_KEY = "fintrack-sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PrivacyProvider>
      <PeriodProvider>
        <AppActionsProvider>
          <ShellFrame>{children}</ShellFrame>
        </AppActionsProvider>
      </PeriodProvider>
    </PrivacyProvider>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const actions = useAppActions();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });

  useHotkeys({
    "mod+k": () => actions.openCommand(),
    n: () => actions.openEntry(),
    s: () => actions.openScanner(),
    "/": () => {
      if (pathname.startsWith("/transactions")) document.getElementById("tx-search")?.focus();
      else router.push("/transactions?focus=search");
    },
  });

  // A 401 is redirected by the API client; anything else falls back to /login too.
  useEffect(() => {
    if (me.isError) window.location.replace("/login");
  }, [me.isError]);

  return (
    <div className="relative min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-surface-1 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-elev-3"
      >
        {t.nav.skipToContent}
      </a>

      {/* Ambient page wash — static, so it costs nothing while scrolling */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[420px] w-[620px] rounded-full bg-brand/[0.07] blur-3xl dark:bg-brand/[0.12]" />
        <div className="absolute -top-24 right-0 h-[360px] w-[520px] rounded-full bg-ai/[0.06] blur-3xl dark:bg-ai/[0.08]" />
      </div>

      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />

      <div
        className={cn(
          "transition-[padding] duration-slow ease-emphasized md:pl-[72px]",
          !collapsed && "lg:pl-60"
        )}
      >
        {me.data ? <TopBar user={me.data} /> : <TopBarSkeleton />}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-[1440px] px-4 pb-[calc(var(--bottom-nav-h)+2.5rem)] pt-2 focus:outline-none sm:px-6 lg:px-8"
        >
          {me.data ? children : <PageSkeleton />}
        </main>
      </div>

      <BottomNav />
      {me.data && <GlobalOverlays />}
    </div>
  );
}

function TopBarSkeleton() {
  return (
    <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
      <Skeleton className="h-10 w-52 rounded-xl" />
      <Skeleton className="ml-auto size-10 rounded-xl" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5 pt-2" aria-busy="true">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-64 rounded-3xl lg:col-span-8" />
        <Skeleton className="h-64 rounded-3xl lg:col-span-4" />
      </div>
      <Skeleton className="h-52 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
