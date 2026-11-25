"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, ScanLine, Wallet } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useAppActions } from "@/context/app-actions-context";
import { useScrollState } from "@/lib/hooks/use-scroll";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { NAV_ITEMS, isActive } from "./nav-items";

const itemClass =
  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[0.75rem] font-medium leading-none transition-colors";

/** Phone navigation: tabs + a raised Scan action. Hides while scrolling down. */
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { openScanner, openEntry, openWallets } = useAppActions();
  const { direction } = useScrollState();
  const hidden = direction === "down";

  const [overview, transactions] = NAV_ITEMS;

  const tab = (item: typeof overview, label: string) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(itemClass, active ? "text-brand-fg" : "text-fg-subtle")}
      >
        {active && (
          <motion.span
            layoutId="bottom-active"
            transition={spring.snappy}
            aria-hidden
            className="absolute inset-x-2 inset-y-0 -z-10 rounded-2xl bg-brand/10"
          />
        )}
        <item.icon className="size-5" aria-hidden />
        <span className="max-w-full truncate px-1">{label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label={t.nav.mainNav}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-1/85 backdrop-blur-xl transition-transform duration-slow ease-emphasized md:hidden",
        hidden && "translate-y-full"
      )}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-md items-stretch gap-1 px-2 pb-safe">
        {tab(overview, t.nav.overview)}
        {tab(transactions, t.nav.transactionsShort)}

        <div className="flex flex-1 items-start justify-center">
          <button
            type="button"
            onClick={openScanner}
            aria-label={t.nav.scan}
            className="relative -mt-5 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-ai to-[#38BDF8] text-ai-ink shadow-glow-ai ring-4 ring-bg transition active:scale-95"
          >
            <span aria-hidden style={{ animationIterationCount: 3 }} className="absolute inset-0 rounded-2xl bg-ai/40 animate-pulse-ring motion-reduce:hidden" />
            <ScanLine className="relative size-6" aria-hidden />
          </button>
        </div>

        <button type="button" onClick={openEntry} className={cn(itemClass, "text-fg-subtle")}>
          <Plus className="size-5" aria-hidden />
          <span className="max-w-full truncate px-1">{t.nav.addShort}</span>
        </button>
        <button type="button" onClick={openWallets} className={cn(itemClass, "text-fg-subtle")}>
          <Wallet className="size-5" aria-hidden />
          <span className="max-w-full truncate px-1">{t.nav.pockets}</span>
        </button>
      </div>
    </nav>
  );
}
