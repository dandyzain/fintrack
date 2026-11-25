import type { NewUserSetup } from "../store/types";

/** Starter pockets and categories every new account gets. */
export const DEFAULT_CATEGORIES: NewUserSetup["categories"] = [
  { name: "Makanan & Minuman", icon: "Utensils", color: "#F97316" },
  { name: "Belanja Bulanan", icon: "ShoppingCart", color: "#10B981" },
  { name: "Transportasi", icon: "Car", color: "#3B82F6" },
  { name: "Tagihan & Utilitas", icon: "Receipt", color: "#0EA5E9" },
  { name: "Kesehatan", icon: "HeartPulse", color: "#EC4899" },
  { name: "Hiburan", icon: "Film", color: "#8B5CF6" },
  { name: "Gaji & Pendapatan", icon: "Banknote", color: "#22C55E" },
  { name: "Lainnya", icon: "Tag", color: "#6B7280" },
];

export const DEFAULT_WALLETS: NewUserSetup["wallets"] = [
  { name: "Rekening Bank", balance: 0 },
  { name: "Dompet Tunai", balance: 0 },
  { name: "E-Wallet", balance: 0 },
];

export function defaultUserSetup(): NewUserSetup {
  return { wallets: DEFAULT_WALLETS.map((w) => ({ ...w })), categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })) };
}
