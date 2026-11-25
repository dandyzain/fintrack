import { BarChart3, LayoutGrid, ListOrdered, Repeat, Settings, Target, type LucideIcon } from "lucide-react";
import type { TranslationSchema } from "@/lib/i18n/translations";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: (t: TranslationSchema) => string;
}

/** First two are the phone tabs; the rest live in the sidebar and the phone "More" sheet. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: LayoutGrid, label: (t) => t.nav.overview },
  { href: "/transactions", icon: ListOrdered, label: (t) => t.nav.transactions },
  { href: "/budgets", icon: Target, label: (t) => t.nav.budgets },
  { href: "/reports", icon: BarChart3, label: (t) => t.nav.reports },
  { href: "/recurring", icon: Repeat, label: (t) => t.nav.recurring },
  { href: "/settings", icon: Settings, label: (t) => t.nav.settings },
];

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);
