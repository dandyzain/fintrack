"use client";

import { useRef, useState } from "react";
import { Languages, LogOut, Monitor, Moon, Sun } from "lucide-react";
import type { AuthUser } from "@fintrack/shared";
import { useLanguage } from "@/context/language-context";
import { useThemeSwitch } from "@/lib/hooks/use-theme-switch";
import { endpoints } from "@/lib/api/client";
import { initials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ user }: { user: AuthUser }) {
  const { t, language, setLanguage } = useLanguage();
  const { theme, switchTheme } = useThemeSwitch();
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const origin = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await endpoints.logout();
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${initials(user.name)} · ${t.nav.account}`}
          className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-[#1D4ED8] text-sm font-bold text-white shadow-elev-1 ring-2 ring-surface-1 transition hover:brightness-110 active:scale-95 coarse:size-11"
        >
          {initials(user.name)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2.5 pb-2 pt-1.5">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-[#1D4ED8] text-sm font-bold text-white"
          >
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
            <p className="truncate text-xs text-fg-subtle">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t.nav.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => switchTheme(v as "light" | "dark" | "system", origin())}
        >
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden />
            {t.nav.themeSystem}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden />
            {t.nav.themeLight}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden />
            {t.nav.themeDark}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t.nav.language}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={language} onValueChange={(v) => setLanguage(v as "en" | "id")}>
          <DropdownMenuRadioItem value="en">
            <Languages aria-hidden />
            English
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="id">
            <Languages aria-hidden />
            Bahasa Indonesia
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive disabled={signingOut} onSelect={signOut}>
          <LogOut aria-hidden />
          {signingOut ? t.nav.signingOut : t.nav.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
