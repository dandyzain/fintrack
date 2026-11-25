import { getStore } from "@/lib/server/store";
import { defaultUserSetup } from "@/lib/server/domain/defaults";
import type { FinanceStore, TransactionInput } from "@/lib/server/store/types";

/** Empties whichever store is active (memory reset or TRUNCATE in PostgreSQL). */
export async function resetStore(): Promise<void> {
  const store = getStore() as FinanceStore & { reset?: () => void };
  if (store.reset) return store.reset();
  const { prisma } = await import("@fintrack/database");
  await prisma.$executeRawUnsafe(
    `TRUNCATE transaction_items, transactions, recurring_transactions, budgets, wallets, categories, auth_tokens, rate_limits, users RESTART IDENTITY CASCADE`
  );
}

let counter = 0;
export async function makeUser(store: FinanceStore = getStore()) {
  counter++;
  const user = await store.createUser(
    { name: `Tester ${counter}`, email: `tester${counter}-${Date.now()}@example.com`, passwordHash: null },
    defaultUserSetup()
  );
  const wallets = await store.listWallets(user.id);
  const categories = await store.listCategories(user.id);
  return { user, wallets, categories };
}

export function txInput(p: Partial<TransactionInput> & Pick<TransactionInput, "walletId">): TransactionInput {
  return {
    toWalletId: null,
    categoryId: null,
    amount: 10_000,
    type: "EXPENSE",
    date: new Date("2026-11-10T00:00:00.000Z"),
    merchantName: null,
    notes: null,
    receiptImageUrl: null,
    rawOcrData: null,
    items: [],
    ...p,
  };
}

export async function balances(userId: string, store: FinanceStore = getStore()) {
  return Object.fromEntries((await store.listWallets(userId)).map((w) => [w.id, w.balance]));
}
