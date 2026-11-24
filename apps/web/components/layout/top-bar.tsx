"use client";

import Link from "next/link";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, RefreshCw, Search } from "lucide-react";
import type { AuthUser } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { usePrivacy } from "@/context/privacy-context";
import { useAppActions } from "@/context/app-actions-context";
import { useScrollState } from "@/lib/hooks/use-scroll";
import { invalidateFinance } from "@/lib/api/queries";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/feedback";
import { BrandMark } from "./brand-mark";
import { PeriodSwitcher } from "./period-switcher";
import { UserMenu } from "./user-menu";

const iconBtn =
  "grid size-10 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg active:scale-95 coarse:size-11";

export function TopBar({ user }: { user: AuthUser }) {
  const { t } = useLanguage();
  const { hidden, toggle } = usePrivacy();
  const { openCommand } = useAppActions();
  const { scrolled } = useScrollState();
  const qc = useQueryClient();
  const fetching = useIsFetching() > 0;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-slow ease-standard pt-safe",
        scrolled ? "border-line bg-bg/80 shadow-elev-1 backdrop-blur-xl" : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="FinTrack" className="mr-1 rounded-xl md:hidden">
          <BrandMark size={32} glow />
        </Link>

        <PeriodSwitcher />

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={openCommand}
            className="mr-1 hidden h-10 items-center gap-2 rounded-xl border border-line bg-surface-1 px-3 text-sm text-fg-subtle shadow-elev-1 transition hover:border-line-strong hover:text-fg lg:flex"
          >
            <Search className="size-4" aria-hidden />
            <span className="pr-6">{t.nav.commandPalette}</span>
            <Kbd>⌘K</Kbd>
          </button>

          <Tooltip content={fetching ? t.common.refreshing : t.common.refresh}>
            <button
              type="button"
              onClick={() => invalidateFinance(qc)}
              aria-label={t.common.refresh}
              className={cn(iconBtn, "hidden sm:grid")}
            >
              <RefreshCw className={cn("size-[18px]", fetching && "animate-spin text-brand-fg")} aria-hidden />
            </button>
          </Tooltip>

          <Tooltip content={hidden ? t.nav.privacyOff : t.nav.privacyOn}>
            <button
              type="button"
              onClick={toggle}
              aria-pressed={hidden}
              aria-label={t.nav.privacyOn}
              className={iconBtn}
            >
              {hidden ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
            </button>
          </Tooltip>

          <div className="ml-1">
            <UserMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}
