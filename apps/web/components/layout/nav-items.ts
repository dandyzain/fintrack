import { LayoutGrid, ListOrdered, type LucideIcon } from "lucide-react";
import type { TranslationSchema } from "@/lib/i18n/translations";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: (t: TranslationSchema) => string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: LayoutGrid, label: (t) => t.nav.overview },
  { href: "/transactions", icon: ListOrdered, label: (t) => t.nav.transactions },
];

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);
