import type { TransactionQuery } from "./client";
import type { Period } from "@/lib/period";

/** Query keys live in a plain module so server components can prefetch with them. */
export const queryKeys = {
  me: ["me"] as const,
  wallets: ["wallets"] as const,
  categories: ["categories"] as const,
  analytics: (p: Period) => ["analytics", p.year, p.month] as const,
  transactions: ["transactions"] as const,
  transactionList: (q: TransactionQuery) => ["transactions", "list", q] as const,
  recent: (q: TransactionQuery) => ["transactions", "recent", q] as const,
  transaction: (id: string) => ["transaction", id] as const,
};
