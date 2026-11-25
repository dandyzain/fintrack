"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Eye, Languages, LayoutGrid, ListOrdered, LogOut, Moon, Plus, ScanLine, Search, Wallet } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { usePrivacy } from "@/context/privacy-context";
import { useAppActions } from "@/context/app-actions-context";
import { useThemeSwitch } from "@/lib/hooks/use-theme-switch";
import { endpoints } from "@/lib/api/client";
import { overlayClass } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

/** ⌘K / Ctrl+K command palette (desktop power users; also reachable from the sidebar). */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const { toggle: togglePrivacy, hidden } = usePrivacy();
  const { openScanner, openEntry, openWallets } = useAppActions();
  const { resolvedTheme, switchTheme } = useThemeSwitch();

  const run = (fn: () => void) => () => {
    onOpenChange(false);
    // Let the palette close before opening another overlay.
    window.setTimeout(fn, 60);
  };

  const groups: { heading: string; items: { id: string; label: string; icon: React.ElementType; shortcut?: string; onSelect: () => void }[] }[] = [
    {
      heading: t.command.groupActions,
      items: [
        { id: "scan", label: t.nav.scan, icon: ScanLine, shortcut: "S", onSelect: run(openScanner) },
        { id: "add", label: t.nav.add, icon: Plus, shortcut: "N", onSelect: run(openEntry) },
        { id: "pockets", label: t.nav.pockets, icon: Wallet, onSelect: run(openWallets) },
      ],
    },
    {
      heading: t.command.groupNavigate,
      items: [
        { id: "overview", label: t.nav.overview, icon: LayoutGrid, onSelect: run(() => router.push("/")) },
        { id: "transactions", label: t.nav.transactions, icon: ListOrdered, shortcut: "/", onSelect: run(() => router.push("/transactions")) },
      ],
    },
    {
      heading: t.command.groupPreferences,
      items: [
        { id: "theme", label: t.command.toggleTheme, icon: Moon, onSelect: run(() => switchTheme(resolvedTheme === "dark" ? "light" : "dark")) },
        { id: "lang", label: t.command.switchLanguage, icon: Languages, onSelect: run(() => setLanguage(language === "en" ? "id" : "en")) },
        { id: "privacy", label: hidden ? t.nav.privacyOff : t.nav.privacyOn, icon: Eye, onSelect: run(togglePrivacy) },
        {
          id: "signout",
          label: t.nav.signOut,
          icon: LogOut,
          onSelect: run(async () => {
            await endpoints.logout();
            window.location.href = "/login";
          }),
        },
      ],
    },
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={t.nav.commandPalette}
      overlayClassName={overlayClass}
      contentClassName={cn(
        "fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-3xl border border-line bg-surface-1 shadow-elev-3",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
      )}
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        <Command.Input
          placeholder={t.command.placeholder}
          className="h-14 w-full bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-fg-subtle">{t.command.empty}</Command.Empty>
        {groups.map((g) => (
          <Command.Group
            key={g.heading}
            heading={g.heading}
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-subtle"
          >
            {g.items.map((item) => (
              <Command.Item
                key={item.id}
                value={`${item.id} ${item.label}`}
                onSelect={item.onSelect}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg data-[selected=true]:bg-surface-2"
              >
                <item.icon className="size-4 text-fg-subtle" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
