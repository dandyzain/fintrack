import { beforeEach, describe, expect, it } from "vitest";
import { getStore } from "@/lib/server/store";
import { HttpError } from "@/lib/server/errors";
import { buildSampleData } from "@/lib/server/domain/sample-data";
import { DEFAULT_CATEGORIES } from "@/lib/server/domain/defaults";
import { processDueRecurring } from "@/lib/server/services/recurring";
import { balances, makeUser, resetStore, txInput } from "../helpers";

const status = async (p: Promise<unknown>) => {
  try {
    await p;
    return 0;
  } catch (err) {
    if (err instanceof HttpError) return err.status;
    throw err;
  }
};

/**
 * Behaviour every FinanceStore must have. Runs against the memory store in the
 * unit suite and against PostgreSQL in the integration suite.
 */
export function runStoreContract(label: string) {
  describe(`FinanceStore contract (${label})`, () => {
    beforeEach(async () => {
      await resetStore();
    });

    it("creates a user with starter pockets and categories atomically", async () => {
      const { user, wallets, categories } = await makeUser();
      expect(wallets).toHaveLength(3);
      expect(categories.map((c) => c.name)).toContain("Makanan & Minuman");
      expect(await getStore().findUserByEmail(user.email.toUpperCase())).not.toBeNull();
      expect(await status(getStore().createUser({ name: "X", email: user.email, passwordHash: null }, { wallets: [], categories: [] }))).toBe(409);
    });

    it("applies expense, income and transfer effects to balances", async () => {
      const store = getStore();
      const { user, wallets } = await makeUser();
      const [a, b] = wallets;
      await store.createTransaction(user.id, txInput({ walletId: a.id, type: "INCOME", amount: 1_000_000 }));
      await store.createTransaction(user.id, txInput({ walletId: a.id, type: "EXPENSE", amount: 250_000.5 }));
      await store.createTransaction(user.id, txInput({ walletId: a.id, toWalletId: b.id, type: "TRANSFER", amount: 100_000 }));
      const bal = await balances(user.id);
      expect(bal[a.id]).toBe(649_999.5);
      expect(bal[b.id]).toBe(100_000);
    });

    it("rejects transfers to the same pocket and to another user's pocket", async () => {
      const store = getStore();
      const { user, wallets } = await makeUser();
      const other = await makeUser();
      expect(await status(store.createTransaction(user.id, txInput({ walletId: wallets[0].id, toWalletId: wallets[0].id, type: "TRANSFER" })))).toBe(400);
      expect(await status(store.createTransaction(user.id, txInput({ walletId: wallets[0].id, toWalletId: other.wallets[0].id, type: "TRANSFER" })))).toBe(404);
      expect(await status(store.createTransaction(user.id, txInput({ walletId: other.wallets[0].id })))).toBe(404);
      expect(await status(store.createTransaction(user.id, txInput({ walletId: wallets[0].id, categoryId: other.categories[0].id })))).toBe(400);
      expect((await balances(other.user.id))[other.wallets[0].id]).toBe(0);
    });

    it("never loses a balance update under concurrent writes", async () => {
      const store = getStore();
      const { user, wallets } = await makeUser();
      await Promise.all(
        Array.from({ length: 25 }, () => store.createTransaction(user.id, txInput({ walletId: wallets[0].id, type: "EXPENSE", amount: 1_000 })))
      );
      expect((await balances(user.id))[wallets[0].id]).toBe(-25_000);
    });

    it("re-applies balances when a transaction changes amount, type, or pocket", async () => {
      const store = getStore();
      const { user, wallets } = await makeUser();
      const [a, b, c] = wallets;
      const tx = await store.createTransaction(user.id, txInput({ walletId: a.id, amount: 50_000 }));
      await store.updateTransaction(user.id, tx.id, { amount: 70_000 });
      expect((await balances(user.id))[a.id]).toBe(-70_000);
      await store.updateTransaction(user.id, tx.id, { walletId: b.id, type: "INCOME" });
      let bal = await balances(user.id);
      expect([bal[a.id], bal[b.id]]).toEqual([0, 70_000]);
      await store.updateTransaction(user.id, tx.id, { type: "TRANSFER", toWalletId: c.id });
      bal = await balances(user.id);
      expect([bal[a.id], bal[b.id], bal[c.id]]).toEqual([0, -70_000, 70_000]);
      const updated = await store.getTransaction(user.id, tx.id);
      expect(updated?.categoryId).toBeNull();
      expect(updated?.toWallet?.id).toBe(c.id);
    });

    it("serialises concurrent edits of the same transaction", async () => {
      const store = getStore();
      const { user, wallets } = await makeUser();
      const tx = await store.createTransaction(user.id, txInput({ walletId: wallets[0].id, amount: 10_000 }));
      await Promise.all([
        store.updateTransaction(user.id, tx.id, { amount: 20_000 }),
        store.updateTransaction(user.id, tx.id, { amount: 30_000 }),
      ]);
      const final = await store.getTransaction(user.id, tx.id);
      expect((await balances(user.id))[wallets[0].id]).toBe(-final!.amount);
    });

    it("reverts balances on delete and refuses other users", async () => {
      const store = getStore();
      const { user, wallets } = await makeUser();
      const other = await makeUser();
      const tx = await store.createTransaction(user.id, txInput({ walletId: wallets[0].id, toWalletId: wallets[1].id, type: "TRANSFER", amount: 5_000 }));
      expect(await status(store.deleteTransaction(other.user.id, tx.id))).toBe(404);
      expect(await store.getTransaction(other.user.id, tx.id)).toBeNull();
      await store.deleteTransaction(user.id, tx.id);
      const bal = await balances(user.id);
      expect([bal[wallets[0].id], bal[wallets[1].id]]).toEqual([0, 0]);
      expect(await status(store.deleteTransaction(user.id, tx.id))).toBe(404);
    });

    it("filters, searches case-insensitively and paginates the ledger", async () => {
      const store = getStore();
      const { user, wallets, categories } = await makeUser();
      const food = categories.find((c) => c.name === "Makanan & Minuman")!;
      await store.createTransaction(user.id, txInput({ walletId: wallets[0].id, merchantName: "Kopi Kenangan", categoryId: food.id }));
      await store.createTransaction(user.id, txInput({ walletId: wallets[1].id, merchantName: "Indomaret", date: new Date("2026-10-01T00:00:00Z") }));
      await store.createTransaction(user.id, txInput({ walletId: wallets[0].id, toWalletId: wallets[1].id, type: "TRANSFER" }));
      const search = await store.listTransactions({ userId: user.id, search: "kopi" }, { skip: 0, take: 10 });
      expect(search.items.map((t) => t.merchantName)).toEqual(["Kopi Kenangan"]);
      const byCategoryName = await store.listTransactions({ userId: user.id, search: "MAKANAN" }, { skip: 0, take: 10 });
      expect(byCategoryName.total).toBe(1);
      const pocketB = await store.listTransactions({ userId: user.id, walletId: wallets[1].id }, { skip: 0, take: 10 });
      expect(pocketB.total).toBe(2); // includes the transfer into it
      const page = await store.listTransactions({ userId: user.id, sortBy: "date_desc" }, { skip: 1, take: 1 });
      expect(page.total).toBe(3);
      expect(page.items).toHaveLength(1);
      const november = await store.listTransactions(
        { userId: user.id, startDate: new Date("2026-11-01T00:00:00Z"), endDate: new Date("2026-11-30T23:59:59Z") },
        { skip: 0, take: 10 }
      );
      expect(november.total).toBe(2);
    });

    describe("deleting a pocket", () => {
      it("refuses when it has transactions and no mode is given, and keeps the last pocket", async () => {
        const store = getStore();
        const { user, wallets } = await makeUser();
        await store.createTransaction(user.id, txInput({ walletId: wallets[0].id }));
        expect(await status(store.deleteWallet(user.id, wallets[0].id, { kind: "empty" }))).toBe(409);
        await store.deleteWallet(user.id, wallets[1].id, { kind: "empty" });
        await store.deleteWallet(user.id, wallets[2].id, { kind: "empty" });
        expect(await status(store.deleteWallet(user.id, wallets[0].id, { kind: "delete-all" }))).toBe(400);
      });

      it("moves history and remaining balance to another pocket", async () => {
        const store = getStore();
        const { user, wallets } = await makeUser();
        const [a, b, c] = wallets;
        await store.updateWallet(user.id, a.id, { balance: 100_000 });
        await store.createTransaction(user.id, txInput({ walletId: a.id, amount: 20_000 }));
        await store.createTransaction(user.id, txInput({ walletId: a.id, toWalletId: b.id, type: "TRANSFER", amount: 30_000 }));
        await store.createTransaction(user.id, txInput({ walletId: c.id, toWalletId: a.id, type: "TRANSFER", amount: 5_000 }));
        const before = await balances(user.id);
        const total = before[a.id] + before[b.id] + before[c.id];

        await store.deleteWallet(user.id, a.id, { kind: "move", targetId: b.id });
        const after = await balances(user.id);
        expect(after[a.id]).toBeUndefined();
        expect(after[b.id] + after[c.id]).toBe(total);
        const list = await store.listTransactions({ userId: user.id }, { skip: 0, take: 10 });
        expect(list.total).toBe(2); // the a→b transfer is dropped, the rest moved to b
        expect(list.items.every((t) => t.walletId !== a.id && t.toWalletId !== a.id)).toBe(true);
      });

      it("deletes everything and reverts the other side of transfers", async () => {
        const store = getStore();
        const { user, wallets } = await makeUser();
        const [a, b] = wallets;
        await store.createTransaction(user.id, txInput({ walletId: a.id, toWalletId: b.id, type: "TRANSFER", amount: 30_000 }));
        await store.createTransaction(user.id, txInput({ walletId: b.id, type: "EXPENSE", amount: 1_000 }));
        await store.deleteWallet(user.id, a.id, { kind: "delete-all" });
        const bal = await balances(user.id);
        expect(bal[b.id]).toBe(-1_000);
        expect((await store.listTransactions({ userId: user.id }, { skip: 0, take: 10 })).total).toBe(1);
      });
    });

    it("manages categories: own vs. duplicates; deleting keeps transactions", async () => {
      const store = getStore();
      const { user, wallets } = await makeUser();
      const other = await makeUser();
      const cat = await store.createCategory(user.id, { name: "Hewan Peliharaan", icon: "PawPrint", color: "#AA00FF" });
      expect(await status(store.createCategory(user.id, { name: "hewan peliharaan", icon: "Tag", color: "#000000" }))).toBe(409);
      expect(await status(store.updateCategory(other.user.id, cat.id, { name: "Hack" }))).toBe(404);
      const tx = await store.createTransaction(user.id, txInput({ walletId: wallets[0].id, categoryId: cat.id }));
      await store.upsertBudget(user.id, { categoryId: cat.id, month: 11, year: 2026, limitAmount: 100_000 });
      await store.deleteCategory(user.id, cat.id);
      expect((await store.getTransaction(user.id, tx.id))?.categoryId).toBeNull();
      expect(await store.listBudgets(user.id, 11, 2026)).toHaveLength(0);
    });

    it("upserts, copies and deletes budgets", async () => {
      const store = getStore();
      const { user, categories } = await makeUser();
      const [c1, c2] = categories;
      await store.upsertBudget(user.id, { categoryId: c1.id, month: 10, year: 2026, limitAmount: 100 });
      await store.upsertBudget(user.id, { categoryId: c1.id, month: 10, year: 2026, limitAmount: 200 });
      await store.upsertBudget(user.id, { categoryId: c2.id, month: 10, year: 2026, limitAmount: 50 });
      const oct = await store.listBudgets(user.id, 10, 2026);
      expect(oct).toHaveLength(2);
      expect(oct.find((b) => b.categoryId === c1.id)?.limitAmount).toBe(200);
      await store.upsertBudget(user.id, { categoryId: c2.id, month: 11, year: 2026, limitAmount: 999 });
      expect(await store.copyBudgets(user.id, { month: 10, year: 2026 }, { month: 11, year: 2026 })).toBe(1);
      const nov = await store.listBudgets(user.id, 11, 2026);
      expect(nov.find((b) => b.categoryId === c2.id)?.limitAmount).toBe(999); // existing kept
      await store.deleteBudget(user.id, nov[0].id);
      expect(await store.listBudgets(user.id, 11, 2026)).toHaveLength(1);
    });

    it("materialises recurring occurrences exactly once, even concurrently", async () => {
      const store = getStore();
      const { user, wallets } = await makeUser();
      await store.createRecurring(user.id, {
        walletId: wallets[0].id,
        toWalletId: null,
        categoryId: null,
        type: "EXPENSE",
        amount: 50_000,
        merchantName: "Netflix",
        notes: null,
        frequency: "MONTHLY",
        interval: 1,
        startDate: new Date("2026-01-31T00:00:00Z"),
        nextRunAt: new Date("2026-01-31T00:00:00Z"),
        endDate: null,
      });
      const now = new Date("2026-04-15T12:00:00Z");
      const counts = await Promise.all([processDueRecurring(user.id, now), processDueRecurring(user.id, now), processDueRecurring(user.id, now)]);
      expect(counts.reduce((a, b) => a + b, 0)).toBe(3); // Jan 31, Feb 28, Mar 31
      const list = await store.listTransactions({ userId: user.id, sortBy: "date_asc" }, { skip: 0, take: 10 });
      expect(list.items.map((t) => t.date.toISOString().slice(0, 10))).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
      expect(list.items.every((t) => t.recurringId)).toBe(true);
      expect((await balances(user.id))[wallets[0].id]).toBe(-150_000);
      const [rule] = await store.listRecurring(user.id);
      expect(rule.nextRunAt.toISOString().slice(0, 10)).toBe("2026-04-30");
      expect(await processDueRecurring(user.id, now)).toBe(0);
    });

    it("consumes one-time tokens once and respects expiry", async () => {
      const store = getStore();
      const { user } = await makeUser();
      await store.createAuthToken({ userId: user.id, type: "PASSWORD_RESET", tokenHash: "h1", expiresAt: new Date(Date.now() + 60_000) });
      expect(await store.consumeAuthToken("h1", "EMAIL_VERIFICATION")).toBeNull();
      expect(await store.consumeAuthToken("h1", "PASSWORD_RESET")).toEqual({ userId: user.id });
      expect(await store.consumeAuthToken("h1", "PASSWORD_RESET")).toBeNull();
      await store.createAuthToken({ userId: user.id, type: "PASSWORD_RESET", tokenHash: "h2", expiresAt: new Date(Date.now() - 1) });
      expect(await store.consumeAuthToken("h2", "PASSWORD_RESET")).toBeNull();
    });

    it("counts rate-limit hits per key", async () => {
      const store = getStore();
      expect((await store.hitRateLimit("k1", 60)).count).toBe(1);
      expect((await store.hitRateLimit("k1", 60)).count).toBe(2);
      expect((await store.hitRateLimit("k2", 60)).count).toBe(1);
    });

    it("imports consistent demo sample data and purges old demo users", async () => {
      const store = getStore();
      const demo = await store.createUser(
        { name: "Demo", email: `demo-${Date.now()}@demo.fintrack.invalid`, passwordHash: null, isDemo: true },
        { wallets: [], categories: DEFAULT_CATEGORIES }
      );
      const sample = buildSampleData(new Date("2026-11-25T08:00:00Z"));
      await store.importSampleData(demo.id, sample);
      const wallets = await store.listWallets(demo.id);
      expect(wallets).toHaveLength(3);
      const opening = sample.wallets.reduce((s, w) => s + w.balance, 0);
      const net = sample.transactions.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : t.type === "EXPENSE" ? -t.amount : 0), 0);
      expect(Math.round(wallets.reduce((s, w) => s + w.balance, 0) * 100) / 100).toBe(Math.round((opening + net) * 100) / 100);
      expect((await store.listTransactions({ userId: demo.id }, { skip: 0, take: 1 })).total).toBe(sample.transactions.length);
      expect(await store.listRecurring(demo.id)).toHaveLength(2);
      expect(await store.listBudgets(demo.id, 11, 2026)).toHaveLength(4);

      const removed = await store.deleteDemoUsers(new Date(Date.now() + 1000), 10);
      expect(removed).toContain(demo.id);
      expect(await store.findUserById(demo.id)).toBeNull();
    });

    it("deletes a user with every row they own", async () => {
      const store = getStore();
      const { user, wallets } = await makeUser();
      const keep = await makeUser();
      await store.createTransaction(user.id, txInput({ walletId: wallets[0].id, toWalletId: wallets[1].id, type: "TRANSFER" }));
      await store.deleteUser(user.id);
      expect(await store.findUserById(user.id)).toBeNull();
      expect(await store.listWallets(user.id)).toHaveLength(0);
      expect(await store.listWallets(keep.user.id)).toHaveLength(3);
    });
  });
}
