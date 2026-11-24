"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Plus, ScanLine, Search, Wallet } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useAppActions } from "@/context/app-actions-context";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { Tooltip } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/feedback";
import { BrandLockup } from "./brand-mark";
import { NAV_ITEMS, isActive } from "./nav-items";

/**
 * Desktop: 240px sidebar (collapsible to a 72px rail).
 * Tablet (768–1023px): always the icon rail. Phones use <BottomNav />.
 */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { openScanner, openEntry, openWallets, openCommand } = useAppActions();
  const isWide = useMediaQuery("(min-width: 1024px)");
  const rail = !isWide || collapsed;

  const withTip = (label: string, el: React.ReactElement, shortcut?: string) =>
    rail ? (
      <Tooltip content={label} side="right" shortcut={shortcut}>
        {el}
      </Tooltip>
    ) : (
      el
    );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface-1/80 backdrop-blur-xl md:flex",
        "w-[72px] transition-[width] duration-slow ease-emphasized",
        !collapsed && "lg:w-60"
      )}
    >
      <div className={cn("flex h-16 items-center", rail ? "justify-center" : "px-5")}>
        <Link href="/" aria-label="FinTrack" className="rounded-xl">
          <BrandLockup collapsed={rail} />
        </Link>
      </div>

      <div className={cn("space-y-2 pt-2", rail ? "px-3" : "px-4")}>
        {withTip(
          t.nav.scan,
          <button
            type="button"
            onClick={openScanner}
            aria-label={rail ? t.nav.scan : undefined}
            className={cn(
              "group relative flex h-11 w-full items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-br from-ai to-[rgb(14_165_233)] font-semibold text-white shadow-glow-ai transition active:scale-[0.97]",
              rail ? "justify-center" : "px-3.5"
            )}
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            <ScanLine className="size-5 shrink-0" aria-hidden />
            {!rail && <span className="text-sm">{t.nav.scan}</span>}
          </button>,
          "S"
        )}
        {withTip(
          t.nav.add,
          <button
            type="button"
            onClick={openEntry}
            aria-label={rail ? t.nav.add : undefined}
            className={cn(
              "flex h-11 w-full items-center gap-2.5 rounded-xl border border-line bg-surface-1 text-sm font-semibold text-fg transition hover:border-line-strong hover:bg-surface-2 active:scale-[0.97]",
              rail ? "justify-center" : "px-3.5"
            )}
          >
            <Plus className="size-5 shrink-0 text-brand-fg" aria-hidden />
            {!rail && <span>{t.nav.add}</span>}
          </button>,
          "N"
        )}
      </div>

      <nav aria-label={t.nav.mainNav} className={cn("mt-6 flex-1 space-y-1", rail ? "px-3" : "px-4")}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const label = item.label(t);
          return (
            <div key={item.href}>
              {withTip(
                label,
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={rail ? label : undefined}
                  className={cn(
                    "relative flex h-11 items-center gap-3 rounded-xl text-sm font-medium transition-colors",
                    rail ? "justify-center" : "px-3.5",
                    active ? "text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      transition={spring.snappy}
                      aria-hidden
                      className="absolute inset-0 rounded-xl border border-brand/20 bg-brand/10"
                    />
                  )}
                  <item.icon className={cn("relative size-5 shrink-0", active && "text-brand-fg")} aria-hidden />
                  {!rail && <span className="relative">{label}</span>}
                </Link>
              )}
            </div>
          );
        })}
        {withTip(
          t.nav.pockets,
          <button
            type="button"
            onClick={openWallets}
            aria-label={rail ? t.nav.pockets : undefined}
            className={cn(
              "flex h-11 w-full items-center gap-3 rounded-xl text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg",
              rail ? "justify-center" : "px-3.5"
            )}
          >
            <Wallet className="size-5 shrink-0" aria-hidden />
            {!rail && <span>{t.nav.pockets}</span>}
          </button>
        )}
      </nav>

      <div className={cn("space-y-1 border-t border-line py-3", rail ? "px-3" : "px-4")}>
        {withTip(
          t.nav.commandPalette,
          <button
            type="button"
            onClick={openCommand}
            aria-label={rail ? t.nav.commandPalette : undefined}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl text-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg",
              rail ? "justify-center" : "px-3.5"
            )}
          >
            <Search className="size-4 shrink-0" aria-hidden />
            {!rail && (
              <>
                <span className="flex-1 text-left">{t.common.search}</span>
                <Kbd>⌘K</Kbd>
              </>
            )}
          </button>,
          "⌘K"
        )}
        {isWide && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? t.nav.expand : t.nav.collapse}
            aria-expanded={!collapsed}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl text-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg",
              rail ? "justify-center" : "px-3.5"
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <PanelLeftClose className="size-4" aria-hidden />}
            {!rail && <span>{t.nav.collapse}</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
