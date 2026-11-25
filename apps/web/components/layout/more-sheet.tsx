"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutGrid, Wallet } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useAppActions } from "@/context/app-actions-context";
import { cn } from "@/lib/utils";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { NAV_ITEMS, isActive } from "./nav-items";

const rowClass =
  "flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-1 px-4 py-3 text-left text-sm font-medium text-fg transition hover:bg-surface-2 active:scale-[0.99]";

/** Phone "More" sheet: pockets plus the pages that don't fit in the tab bar. */
export function MoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { openWallets } = useAppActions();
  const extra = NAV_ITEMS.slice(2);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t.nav.moreTitle}
      icon={<LayoutGrid className="text-brand-fg" />}
      closeLabel={t.common.close}
      size="sm"
    >
      <nav aria-label={t.nav.moreTitle}>
        <ul className="space-y-2">
          <li>
            <button
              type="button"
              className={rowClass}
              onClick={() => {
                onOpenChange(false);
                window.setTimeout(openWallets, 60);
              }}
            >
              <Wallet className="size-5 text-brand-fg" aria-hidden />
              <span className="flex-1">{t.nav.pockets}</span>
              <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
            </button>
          </li>
          {extra.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(rowClass, active && "border-brand/30 bg-brand/10")}
                >
                  <item.icon className={cn("size-5", active ? "text-brand-fg" : "text-fg-subtle")} aria-hidden />
                  <span className="flex-1">{item.label(t)}</span>
                  <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </ResponsiveModal>
  );
}
