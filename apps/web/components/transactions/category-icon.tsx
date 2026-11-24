import {
  ArrowDownLeft,
  Car,
  Film,
  GraduationCap,
  HeartPulse,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
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
};

export function resolveCategoryIcon(icon?: string | null): LucideIcon {
  if (!icon) return Tag;
  return ICONS[icon.toLowerCase()] ?? ICONS[icon.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()] ?? Tag;
}

/** Tinted icon bubble; income without a category shows an inbound arrow. */
export function CategoryBubble({
  icon,
  color,
  income = false,
  size = "md",
  className,
}: {
  icon?: string | null;
  color?: string | null;
  income?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = income && !icon ? ArrowDownLeft : resolveCategoryIcon(icon);
  const tint = income && !color ? "rgb(var(--positive))" : color || "rgb(var(--fg-subtle))";
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
