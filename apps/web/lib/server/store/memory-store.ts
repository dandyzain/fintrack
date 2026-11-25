import crypto from "crypto";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { balanceDiff, balanceEffects, revertEffects, type BalanceDeltas } from "../domain/balance";
import type {
  BudgetRecord,
  CategoryRecord,
  FinanceStore,
  RecurringRecord,
  TransactionFilter,
  TransactionInput,
  TransactionRecord,
  UserRecord,
  WalletRecord,
} from "./types";

/**
 * In-memory implementation of FinanceStore, used when DATABASE_URL is not set
 * and in tests. JavaScript runs each method to completion between awaits, and
 * every method below mutates state synchronously, so each operation is atomic.
 * Same rules as the PostgreSQL store: owner checks, balance deltas, wallet
 * deletion modes, budget/category semantics.
 */

type Wallet = Omit<WalletRecord, "transactionCount">;
type Tx = Omit<TransactionRecord, "wallet" | "toWallet" | "category">;

interface State {
  users: UserRecord[];
  wallets: Wallet[];
  categories: CategoryRecord[];
  transactions: Tx[];
  budgets: BudgetRecord[];
  recurring: RecurringRecord[];
  tokens: { userId: string; type: string; tokenHash: string; expiresAt: Date; usedAt: Date | null }[];
  rateLimits: Map<string, { count: number; windowStart: number }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const id = () => crypto.randomUUID();
const clone = <T>(v: T): T => structuredClone(v);

function emptyState(): State {
  return { users: [], wallets: [], categories: [], transactions: [], budgets: [], recurring: [], tokens: [], rateLimits: new Map() };
}

export function createMemoryStore(state: State = emptyState()): FinanceStore & { reset(): void } {
  const s = state;

  const userOf = (userId: string) => s.users.find((u) => u.id === userId);
  const walletOf = (userId: string, wid: string | null | undefined) =>
    wid ? s.wallets.find((w) => w.id === wid && w.userId === userId) : undefined;
  const categoryOf = (userId: string, cid: string | null | undefined) =>
    cid ? s.categories.find((c) => c.id === cid && (c.userId === userId || c.userId === null)) : undefined;

  const requireWallet = (userId: string, wid: string | null | undefined, label = "Kantong") => {
    const w = walletOf(userId, wid);
    if (!w) throw notFound(`${label} tidak ditemukan.`);
    return w;
  };
  const requireCategory = (userId: string, cid: string | null | undefined) => {
    if (cid && !categoryOf(userId, cid)) throw badRequest("Kategori tidak valid atau tidak ditemukan.");
  };

  const applyDeltas = (userId: string, deltas: BalanceDeltas) => {
    // Validate everything first so a failure leaves balances untouched.
    const targets = Array.from(deltas).map(([wid, d]) => [requireWallet(userId, wid), d] as const);
    for (const [w, d] of targets) w.balance = round2(w.balance + d);
  };

  const countFor = (wid: string) => s.transactions.filter((t) => t.walletId === wid || t.toWalletId === wid).length;
  const toWalletRecord = (w: Wallet): WalletRecord => ({ ...clone(w), transactionCount: countFor(w.id) });

  const enrich = (t: Tx): TransactionRecord => {
    const w = s.wallets.find((x) => x.id === t.walletId);
    const tw = t.toWalletId ? s.wallets.find((x) => x.id === t.toWalletId) : undefined;
    const c = t.categoryId ? s.categories.find((x) => x.id === t.categoryId) : undefined;
    return {
      ...clone(t),
      wallet: { id: t.walletId, name: w?.name ?? "—" },
      toWallet: tw ? { id: tw.id, name: tw.name } : null,
      category: c ? { id: c.id, name: c.name, icon: c.icon, color: c.color } : null,
    };
  };

  const insertTx = (userId: string, input: TransactionInput, recurringId: string | null = null): TransactionRecord => {
    requireWallet(userId, input.walletId);
    const transfer = input.type === "TRANSFER";
    if (transfer) {
      if (!input.toWalletId || input.toWalletId === input.walletId) throw badRequest("Kantong asal dan tujuan harus berbeda.");
      requireWallet(userId, input.toWalletId, "Kantong tujuan");
    } else {
      requireCategory(userId, input.categoryId);
    }
    const now = new Date();
    const txId = id();
    const tx: Tx = {
      id: txId,
      userId,
      walletId: input.walletId,
      toWalletId: transfer ? input.toWalletId : null,
      categoryId: transfer ? null : input.categoryId,
      recurringId,
      amount: round2(input.amount),
      type: input.type,
      date: new Date(input.date),
      merchantName: input.merchantName,
      notes: input.notes,
      receiptImageUrl: input.receiptImageUrl,
      rawOcrData: input.rawOcrData ? clone(input.rawOcrData) : null,
      createdAt: now,
      updatedAt: now,
      items: input.items.map((i) => ({ id: id(), name: i.name, price: round2(i.price), quantity: i.quantity })),
    };
    applyDeltas(userId, balanceEffects(tx));
    s.transactions.push(tx);
    return enrich(tx);
  };

  const matches = (t: Tx, f: TransactionFilter) => {
    if (t.userId !== f.userId) return false;
    if (f.walletId && t.walletId !== f.walletId && t.toWalletId !== f.walletId) return false;
    if (f.categoryId && t.categoryId !== f.categoryId) return false;
    if (f.type && t.type !== f.type) return false;
    if (f.hasReceipt === true && !t.receiptImageUrl) return false;
    if (f.hasReceipt === false && t.receiptImageUrl) return false;
    if (f.startDate && t.date < f.startDate) return false;
    if (f.endDate && t.date > f.endDate) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const cat = t.categoryId ? s.categories.find((c) => c.id === t.categoryId)?.name : "";
      if (![t.merchantName, t.notes, cat].some((v) => v?.toLowerCase().includes(q))) return false;
    }
    return true;
  };

  const sorter = (sortBy: TransactionFilter["sortBy"]) => (a: Tx, b: Tx) => {
    switch (sortBy) {
      case "date_asc":
        return a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime();
      case "amount_desc":
        return b.amount - a.amount || b.date.getTime() - a.date.getTime();
      case "amount_asc":
        return a.amount - b.amount || b.date.getTime() - a.date.getTime();
      default:
        return b.date.getTime() - a.date.getTime() || b.createdAt.getTime() - a.createdAt.getTime();
    }
  };

  const removeUser = (userId: string) => {
    s.transactions = s.transactions.filter((t) => t.userId !== userId);
    s.recurring = s.recurring.filter((r) => r.userId !== userId);
    s.budgets = s.budgets.filter((b) => b.userId !== userId);
    s.wallets = s.wallets.filter((w) => w.userId !== userId);
    s.categories = s.categories.filter((c) => c.userId !== userId);
    s.tokens = s.tokens.filter((t) => t.userId !== userId);
    s.users = s.users.filter((u) => u.id !== userId);
  };

  const store: FinanceStore & { reset(): void } = {
    mode: "memory",

    reset() {
      Object.assign(s, emptyState());
    },

    /* ---------- users ---------- */

    async findUserByEmail(email) {
      const u = s.users.find((x) => x.email === email.toLowerCase());
      return u ? clone(u) : null;
    },

    async findUserById(uid) {
      const u = userOf(uid);
      return u ? clone(u) : null;
    },

    async createUser(data, setup) {
      const email = data.email.toLowerCase();
      if (s.users.some((u) => u.email === email)) throw conflict("Email sudah terdaftar. Silakan gunakan email lain atau masuk.");
      const user: UserRecord = {
        id: id(),
        email,
        name: data.name,
        passwordHash: data.passwordHash,
        emailVerifiedAt: null,
        isDemo: data.isDemo ?? false,
        sessionVersion: 0,
        createdAt: new Date(),
      };
      s.users.push(user);
      for (const w of setup.wallets) s.wallets.push({ id: id(), userId: user.id, name: w.name, balance: round2(w.balance), createdAt: new Date() });
      for (const c of setup.categories) s.categories.push({ id: id(), userId: user.id, ...c });
      return clone(user);
    },

    async updateUser(uid, patch) {
      const u = userOf(uid);
      if (!u) throw notFound("Akun tidak ditemukan.");
      if (patch.email !== undefined) {
        const email = patch.email.toLowerCase();
        if (s.users.some((x) => x.email === email && x.id !== uid)) throw conflict("Email tersebut sudah dipakai akun lain.");
        u.email = email;
      }
      if (patch.name !== undefined) u.name = patch.name;
      if (patch.passwordHash !== undefined) u.passwordHash = patch.passwordHash;
      if (patch.emailVerifiedAt !== undefined) u.emailVerifiedAt = patch.emailVerifiedAt;
      if (patch.bumpSessionVersion) u.sessionVersion++;
      return clone(u);
    },

    async deleteUser(uid) {
      if (!userOf(uid)) throw notFound("Akun tidak ditemukan.");
      removeUser(uid);
    },

    async deleteDemoUsers(olderThan, limit) {
      const stale = s.users.filter((u) => u.isDemo && u.createdAt < olderThan).slice(0, limit).map((u) => u.id);
      stale.forEach(removeUser);
      return stale;
    },

    async importSampleData(userId, data) {
      const cats = s.categories.filter((c) => c.userId === userId || c.userId === null);
      const catId = (name?: string) => (name ? cats.find((c) => c.name === name)?.id ?? null : null);
      const used = new Set(s.transactions.filter((t) => t.userId === userId).flatMap((t) => [t.walletId, t.toWalletId]));
      s.wallets = s.wallets.filter((w) => w.userId !== userId || used.has(w.id));
      const ids = new Map<string, string>();
      for (const w of data.wallets) {
        const wid = id();
        ids.set(w.key, wid);
        s.wallets.push({ id: wid, userId, name: w.name, balance: round2(w.balance), createdAt: new Date() });
      }
      for (const t of data.transactions) {
        const { walletKey, toWalletKey, categoryName, ...rest } = t;
        insertTx(userId, {
          ...rest,
          walletId: ids.get(walletKey)!,
          toWalletId: toWalletKey ? ids.get(toWalletKey)! : null,
          categoryId: t.type === "TRANSFER" ? null : catId(categoryName),
        });
      }
      for (const b of data.budgets) {
        const categoryId = catId(b.categoryName);
        if (categoryId) await store.upsertBudget(userId, { categoryId, month: b.month, year: b.year, limitAmount: b.limitAmount });
      }
      for (const r of data.recurring) {
        const { walletKey, categoryName, occurrences, ...rest } = r;
        const created = await store.createRecurring(userId, { ...rest, walletId: ids.get(walletKey)!, toWalletId: null, categoryId: catId(categoryName) });
        const rule = s.recurring.find((x) => x.id === created.id)!;
        rule.occurrences = occurrences;
      }
    },

    /* ---------- tokens ---------- */

    async createAuthToken(data) {
      s.tokens = s.tokens.filter((t) => !(t.userId === data.userId && t.type === data.type && !t.usedAt));
      s.tokens.push({ ...data, usedAt: null });
    },

    async consumeAuthToken(tokenHash, type) {
      const t = s.tokens.find((x) => x.tokenHash === tokenHash && x.type === type);
      if (!t || t.usedAt || t.expiresAt <= new Date()) return null;
      t.usedAt = new Date();
      return { userId: t.userId };
    },

    /* ---------- rate limiting ---------- */

    async hitRateLimit(key, windowSeconds) {
      const now = Date.now();
      const cur = s.rateLimits.get(key);
      if (!cur || cur.windowStart <= now - windowSeconds * 1000) {
        s.rateLimits.set(key, { count: 1, windowStart: now });
        return { count: 1, resetAt: new Date(now + windowSeconds * 1000) };
      }
      cur.count++;
      return { count: cur.count, resetAt: new Date(cur.windowStart + windowSeconds * 1000) };
    },

    /* ---------- pockets ---------- */

    async listWallets(userId) {
      return s.wallets
        .filter((w) => w.userId === userId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.name.localeCompare(b.name))
        .map(toWalletRecord);
    },

    async getWallet(userId, wid) {
      const w = walletOf(userId, wid);
      return w ? toWalletRecord(w) : null;
    },

    async createWallet(userId, data) {
      const w: Wallet = { id: id(), userId, name: data.name, balance: round2(data.balance), createdAt: new Date() };
      s.wallets.push(w);
      return toWalletRecord(w);
    },

    async updateWallet(userId, wid, data) {
      const w = requireWallet(userId, wid);
      if (data.name !== undefined) w.name = data.name;
      if (data.balance !== undefined) w.balance = round2(data.balance);
      return toWalletRecord(w);
    },

    async deleteWallet(userId, wid, mode) {
      const w = requireWallet(userId, wid);
      if (s.wallets.filter((x) => x.userId === userId).length <= 1) {
        throw badRequest("Tidak dapat menghapus kantong terakhir. Akun Anda harus memiliki minimal satu kantong.");
      }
      const used = countFor(wid);
      if (mode.kind === "empty" && used > 0) {
        throw conflict(`Kantong ini masih memiliki ${used} transaksi. Pindahkan transaksinya ke kantong lain atau hapus semuanya.`);
      }
      if (mode.kind === "move" && used > 0) {
        if (mode.targetId === wid) throw badRequest("Pilih kantong tujuan yang berbeda.");
        const target = requireWallet(userId, mode.targetId, "Kantong tujuan");
        const isPair = (a: string, b: string | null) => (a === wid && b === target.id) || (a === target.id && b === wid);
        s.transactions = s.transactions.filter((t) => !(t.type === "TRANSFER" && isPair(t.walletId, t.toWalletId)));
        s.recurring = s.recurring.filter((r) => !(r.type === "TRANSFER" && isPair(r.walletId, r.toWalletId)));
        for (const t of s.transactions) {
          if (t.walletId === wid) t.walletId = target.id;
          if (t.toWalletId === wid) t.toWalletId = target.id;
        }
        for (const r of s.recurring) {
          if (r.walletId === wid) r.walletId = target.id;
          if (r.toWalletId === wid) r.toWalletId = target.id;
        }
        target.balance = round2(target.balance + w.balance);
      }
      if (mode.kind === "delete-all" && used > 0) {
        const deltas: BalanceDeltas = new Map();
        for (const t of s.transactions) {
          if (t.type !== "TRANSFER") continue;
          if (t.walletId === wid && t.toWalletId && t.toWalletId !== wid) deltas.set(t.toWalletId, (deltas.get(t.toWalletId) ?? 0) - t.amount);
          if (t.toWalletId === wid && t.walletId !== wid) deltas.set(t.walletId, (deltas.get(t.walletId) ?? 0) + t.amount);
        }
        s.transactions = s.transactions.filter((t) => t.walletId !== wid && t.toWalletId !== wid);
        applyDeltas(userId, deltas);
      }
      s.recurring = s.recurring.filter((r) => r.walletId !== wid && r.toWalletId !== wid);
      s.wallets = s.wallets.filter((x) => x.id !== wid);
    },

    /* ---------- categories ---------- */

    async listCategories(userId) {
      return s.categories
        .filter((c) => c.userId === userId || c.userId === null)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(clone);
    },

    async createCategory(userId, data) {
      if (s.categories.some((c) => (c.userId === userId || c.userId === null) && c.name.toLowerCase() === data.name.toLowerCase())) {
        throw conflict("Kategori dengan nama tersebut sudah ada.");
      }
      const c: CategoryRecord = { id: id(), userId, ...data };
      s.categories.push(c);
      return clone(c);
    },

    async updateCategory(userId, cid, data) {
      const c = categoryOf(userId, cid);
      if (!c) throw notFound("Kategori tidak ditemukan.");
      if (c.userId === null) throw forbidden("Kategori bawaan tidak dapat diubah.");
      if (
        data.name &&
        s.categories.some((x) => x.id !== cid && (x.userId === userId || x.userId === null) && x.name.toLowerCase() === data.name!.toLowerCase())
      ) {
        throw conflict("Kategori dengan nama tersebut sudah ada.");
      }
      Object.assign(c, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
      return clone(c);
    },

    async deleteCategory(userId, cid) {
      const c = categoryOf(userId, cid);
      if (!c) throw notFound("Kategori tidak ditemukan.");
      if (c.userId === null) throw forbidden("Kategori bawaan tidak dapat dihapus.");
      for (const t of s.transactions) if (t.categoryId === cid) t.categoryId = null;
      for (const r of s.recurring) if (r.categoryId === cid) r.categoryId = null;
      s.budgets = s.budgets.filter((b) => b.categoryId !== cid);
      s.categories = s.categories.filter((x) => x.id !== cid);
    },

    /* ---------- transactions ---------- */

    async listTransactions(filter, page) {
      const all = s.transactions.filter((t) => matches(t, filter)).sort(sorter(filter.sortBy));
      return { total: all.length, items: all.slice(page.skip, page.skip + page.take).map(enrich) };
    },

    async getTransaction(userId, tid) {
      const t = s.transactions.find((x) => x.id === tid && x.userId === userId);
      return t ? enrich(t) : null;
    },

    async createTransaction(userId, input) {
      return insertTx(userId, input);
    },

    async updateTransaction(userId, tid, patch) {
      const t = s.transactions.find((x) => x.id === tid && x.userId === userId);
      if (!t) throw notFound("Transaksi tidak ditemukan.");
      const type = patch.type ?? t.type;
      const transfer = type === "TRANSFER";
      const next = {
        type,
        amount: patch.amount !== undefined ? round2(patch.amount) : t.amount,
        walletId: patch.walletId ?? t.walletId,
        toWalletId: transfer ? (patch.toWalletId !== undefined ? patch.toWalletId : t.toWalletId) : null,
        categoryId: transfer ? null : patch.categoryId !== undefined ? patch.categoryId : t.categoryId,
      };
      if (transfer && (!next.toWalletId || next.toWalletId === next.walletId)) throw badRequest("Transfer membutuhkan kantong tujuan yang berbeda.");
      requireWallet(userId, next.walletId);
      if (transfer) requireWallet(userId, next.toWalletId, "Kantong tujuan");
      if (next.categoryId !== t.categoryId) requireCategory(userId, next.categoryId);

      applyDeltas(userId, balanceDiff(t, next));
      Object.assign(t, next);
      if (patch.date !== undefined) t.date = new Date(patch.date);
      if (patch.merchantName !== undefined) t.merchantName = patch.merchantName;
      if (patch.notes !== undefined) t.notes = patch.notes;
      if (patch.receiptImageUrl !== undefined) t.receiptImageUrl = patch.receiptImageUrl;
      if (patch.rawOcrData !== undefined) t.rawOcrData = patch.rawOcrData ? clone(patch.rawOcrData) : null;
      if (patch.items !== undefined) t.items = patch.items.map((i) => ({ id: id(), name: i.name, price: round2(i.price), quantity: i.quantity }));
      t.updatedAt = new Date();
      return enrich(t);
    },

    async deleteTransaction(userId, tid) {
      const t = s.transactions.find((x) => x.id === tid && x.userId === userId);
      if (!t) throw notFound("Transaksi tidak ditemukan.");
      const record = enrich(t);
      applyDeltas(userId, revertEffects(t));
      s.transactions = s.transactions.filter((x) => x.id !== tid);
      return record;
    },

    async transactionsBetween(userId, start, end) {
      return s.transactions
        .filter((t) => t.userId === userId && t.date >= start && t.date <= end)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(enrich);
    },

    async receiptRefs(userId) {
      return s.transactions.filter((t) => t.userId === userId && t.receiptImageUrl).map((t) => t.receiptImageUrl as string);
    },

    /* ---------- budgets ---------- */

    async listBudgets(userId, month, year) {
      return s.budgets.filter((b) => b.userId === userId && b.month === month && b.year === year).map(clone);
    },

    async listAllBudgets(userId) {
      return s.budgets.filter((b) => b.userId === userId).sort((a, b) => a.year - b.year || a.month - b.month).map(clone);
    },

    async upsertBudget(userId, data) {
      requireCategory(userId, data.categoryId);
      const existing = s.budgets.find(
        (b) => b.userId === userId && b.categoryId === data.categoryId && b.month === data.month && b.year === data.year
      );
      if (existing) {
        existing.limitAmount = round2(data.limitAmount);
        return clone(existing);
      }
      const b: BudgetRecord = { id: id(), userId, ...data, limitAmount: round2(data.limitAmount) };
      s.budgets.push(b);
      return clone(b);
    },

    async deleteBudget(userId, bid) {
      const before = s.budgets.length;
      s.budgets = s.budgets.filter((b) => !(b.id === bid && b.userId === userId));
      if (s.budgets.length === before) throw notFound("Anggaran tidak ditemukan.");
    },

    async copyBudgets(userId, from, to) {
      let count = 0;
      for (const b of s.budgets.filter((x) => x.userId === userId && x.month === from.month && x.year === from.year)) {
        const exists = s.budgets.some((x) => x.userId === userId && x.categoryId === b.categoryId && x.month === to.month && x.year === to.year);
        if (exists) continue;
        s.budgets.push({ id: id(), userId, categoryId: b.categoryId, limitAmount: b.limitAmount, month: to.month, year: to.year });
        count++;
      }
      return count;
    },

    /* ---------- recurring ---------- */

    async listRecurring(userId) {
      return s.recurring
        .filter((r) => r.userId === userId)
        .sort((a, b) => Number(b.active) - Number(a.active) || a.nextRunAt.getTime() - b.nextRunAt.getTime())
        .map(clone);
    },

    async getRecurring(userId, rid) {
      const r = s.recurring.find((x) => x.id === rid && x.userId === userId);
      return r ? clone(r) : null;
    },

    async createRecurring(userId, data) {
      requireWallet(userId, data.walletId);
      const transfer = data.type === "TRANSFER";
      if (transfer) requireWallet(userId, data.toWalletId, "Kantong tujuan");
      else requireCategory(userId, data.categoryId);
      const r: RecurringRecord = {
        id: id(),
        userId,
        ...data,
        toWalletId: transfer ? data.toWalletId : null,
        categoryId: transfer ? null : data.categoryId,
        amount: round2(data.amount),
        occurrences: 0,
        active: true,
        lastRunAt: null,
        createdAt: new Date(),
      };
      s.recurring.push(r);
      return clone(r);
    },

    async updateRecurring(userId, rid, patch) {
      const r = s.recurring.find((x) => x.id === rid && x.userId === userId);
      if (!r) throw notFound("Transaksi berulang tidak ditemukan.");
      if (patch.categoryId) requireCategory(userId, patch.categoryId);
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) (r as unknown as Record<string, unknown>)[k] = v;
      return clone(r);
    },

    async deleteRecurring(userId, rid) {
      const before = s.recurring.length;
      s.recurring = s.recurring.filter((r) => !(r.id === rid && r.userId === userId));
      if (s.recurring.length === before) throw notFound("Transaksi berulang tidak ditemukan.");
    },

    async listDueRecurring(userId, now, limit) {
      return s.recurring
        .filter((r) => r.active && r.nextRunAt <= now && (!userId || r.userId === userId))
        .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
        .slice(0, limit)
        .map(clone);
    },

    async advanceRecurring(a) {
      const r = s.recurring.find((x) => x.id === a.ruleId && x.userId === a.userId);
      if (!r || !r.active || r.nextRunAt.getTime() !== a.expectedNextRunAt.getTime()) return false;
      insertTx(a.userId, a.transaction, r.id); // throws before mutating the rule if invalid
      r.nextRunAt = a.nextRunAt;
      r.occurrences = a.occurrences;
      r.active = a.active;
      r.lastRunAt = new Date();
      return true;
    },
  };

  return store;
}
