import {
  ArrowDownLeft,
  ArrowRightLeft,
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  Coffee,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  shoppingcart: ShoppingCart,
  "shopping-cart": ShoppingCart,
  shoppingbag: ShoppingBag,
  "shopping-bag": ShoppingBag,
  car: Car,
  heartpulse: HeartPulse,
  "heart-pulse": HeartPulse,
  film: Film,
  tag: Tag,
  zap: Zap,
  receipt: Receipt,
  "graduation-cap": GraduationCap,
  graduationcap: GraduationCap,
  "trending-up": TrendingUp,
  trendingup: TrendingUp,
  banknote: Banknote,
  home: Home,
  plane: Plane,
  gift: Gift,
  coffee: Coffee,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  pawprint: PawPrint,
  baby: Baby,
  shirt: Shirt,
  wifi: Wifi,
  fuel: Fuel,
  "book-open": BookOpen,
  bookopen: BookOpen,
  briefcase: Briefcase,
  "piggy-bank": PiggyBank,
  piggybank: PiggyBank,
};

/** Icons offered when creating a custom category (stored by name). */
export const ICON_CHOICES = [
  "Tag", "Utensils", "Coffee", "ShoppingCart", "ShoppingBag", "Car", "Fuel", "Plane", "Home", "Receipt",
  "Zap", "Wifi", "Smartphone", "HeartPulse", "Dumbbell", "Film", "Gift", "Shirt", "Baby", "PawPrint",
  "GraduationCap", "BookOpen", "Briefcase", "Banknote", "PiggyBank", "TrendingUp",
] as const;

export const COLOR_CHOICES = ["#F97316", "#EF4444", "#EC4899", "#8B5CF6", "#6366F1", "#3B82F6", "#0EA5E9", "#14B8A6", "#10B981", "#22C55E", "#EAB308", "#6B7280"] as const;

export function resolveCategoryIcon(icon?: string | null): LucideIcon {
  if (!icon) return Tag;
  return ICONS[icon.toLowerCase()] ?? ICONS[icon.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()] ?? Tag;
}

/** Tinted icon bubble; income without a category shows an inbound arrow, transfers a two-way arrow. */
export function CategoryBubble({
  icon,
  color,
  income = false,
  transfer = false,
  size = "md",
  className,
}: {
  icon?: string | null;
  color?: string | null;
  income?: boolean;
  transfer?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = transfer ? ArrowRightLeft : income && !icon ? ArrowDownLeft : resolveCategoryIcon(icon);
  const tint = transfer ? "rgb(var(--brand))" : income && !color ? "rgb(var(--positive))" : color || "rgb(var(--fg-subtle))";
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-xl",
        size === "sm" ? "size-8" : "size-10",
        className
      )}
      style={{ color: tint }}
    >
      <span className="absolute inset-0 opacity-[0.14]" style={{ backgroundColor: tint }} />
      <Icon className={cn("relative", size === "sm" ? "size-4" : "size-[18px]")} />
    </span>
  );
}
