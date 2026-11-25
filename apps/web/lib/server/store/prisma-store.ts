import crypto from "crypto";
import { prisma, Prisma } from "@fintrack/database";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { balanceDiff, balanceEffects, revertEffects, type BalanceDeltas } from "../domain/balance";
import type {
  AuthTokenKind,
  BudgetRecord,
  CategoryRecord,
  FinanceStore,
  NewUserSetup,
  RecurringAdvance,
  RecurringInput,
  RecurringPatch,
  RecurringRecord,
  SampleData,
  TransactionFilter,
  TransactionInput,
  TransactionPatch,
  TransactionRecord,
  UserRecord,
  WalletDeleteMode,
  WalletRecord,
} from "./types";

type Tx = Prisma.TransactionClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string | null | undefined): s is string => typeof s === "string" && UUID_RE.test(s);
const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));
const num = (d: Prisma.Decimal | number | null | undefined) => (d == null ? 0 : Number(d));
const TX_OPTIONS = { timeout: 15_000, maxWait: 10_000 };

const userSelect = {
  id: true,
  email: true,
  name: true,
  passwordHash: true,
  emailVerifiedAt: true,
  isDemo: true,
  sessionVersion: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const txInclude = {
  wallet: { select: { id: true, name: true } },
  toWallet: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, icon: true, color: true } },
  items: { select: { id: true, name: true, price: true, quantity: true } },
} satisfies Prisma.TransactionInclude;

const txLightInclude = {
  wallet: { select: { id: true, name: true } },
  toWallet: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, icon: true, color: true } },
} satisfies Prisma.TransactionInclude;

type TxRow = Prisma.TransactionGetPayload<{ include: typeof txLightInclude }> & {
  items?: { id: string; name: string; price: Prisma.Decimal; quantity: number }[];
};

function mapTx(r: TxRow): TransactionRecord {
  return {
    id: r.id,
    userId: r.userId,
    walletId: r.walletId,
    toWalletId: r.toWalletId,
    categoryId: r.categoryId,
    recurringId: r.recurringId,
    amount: num(r.amount),
    type: r.type,
    date: r.date,
    merchantName: r.merchantName,
    notes: r.notes,
    receiptImageUrl: r.receiptImageUrl,
    rawOcrData: (r.rawOcrData as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    wallet: r.wallet,
    toWallet: r.toWallet ?? null,
    category: r.category ?? null,
    items: (r.items ?? []).map((i) => ({ id: i.id, name: i.name, price: num(i.price), quantity: i.quantity })),
  };
}

type WalletRow = Prisma.WalletGetPayload<{
  include: { _count: { select: { transactions: true; incomingTransfers: true } } };
}>;

function mapWallet(w: WalletRow): WalletRecord {
  return {
    id: w.id,
    userId: w.userId,
    name: w.name,
    balance: num(w.balance),
    createdAt: w.createdAt,
    transactionCount: w._count.transactions + w._count.incomingTransfers,
  };
}

const walletInclude = { _count: { select: { transactions: true, incomingTransfers: true } } } as const;

function mapRecurring(r: Prisma.RecurringTransactionGetPayload<object>): RecurringRecord {
  return {
    id: r.id,
    userId: r.userId,
    walletId: r.walletId,
    toWalletId: r.toWalletId,
    categoryId: r.categoryId,
    type: r.type,
    amount: num(r.amount),
    merchantName: r.merchantName,
    notes: r.notes,
    frequency: r.frequency,
    interval: r.interval,
    startDate: r.startDate,
    nextRunAt: r.nextRunAt,
    endDate: r.endDate,
    occurrences: r.occurrences,
    active: r.active,
    lastRunAt: r.lastRunAt,
    createdAt: r.createdAt,
  };
}

function mapBudget(b: Prisma.BudgetGetPayload<object>): BudgetRecord {
  return {
    id: b.id,
    userId: b.userId,
    categoryId: b.categoryId,
    limitAmount: num(b.limitAmount),
    month: b.month,
    year: b.year,
  };
}

async function assertWallet(tx: Tx, userId: string, id: string | null | undefined, label = "Kantong") {
  if (!isUuid(id) || !(await tx.wallet.findFirst({ where: { id, userId }, select: { id: true } }))) {
    throw notFound(`${label} tidak ditemukan.`);
  }
}

async function assertCategory(tx: Tx, userId: string, id: string | null | undefined) {
  if (!id) return;
  const found = isUuid(id) && (await tx.category.findFirst({ where: { id, OR: [{ userId }, { userId: null }] }, select: { id: true } }));
  if (!found) throw badRequest("Kategori tidak valid atau tidak ditemukan.");
}

/** Applies balance deltas with atomic increments, scoped to the owner. */
async function applyDeltas(tx: Tx, userId: string, deltas: BalanceDeltas) {
  for (const [walletId, delta] of Array.from(deltas)) {
    if (delta === 0) continue;
    const res = await tx.wallet.updateMany({ where: { id: walletId, userId }, data: { balance: { increment: dec(delta) } } });
    if (res.count !== 1) throw notFound("Kantong tidak ditemukan.");
  }
}

function txData(userId: string, input: TransactionInput) {
  const transfer = input.type === "TRANSFER";
  return {
    userId,
    walletId: input.walletId,
    toWalletId: transfer ? input.toWalletId : null,
    categoryId: transfer ? null : input.categoryId,
    amount: dec(input.amount),
    type: input.type,
    date: input.date,
    merchantName: input.merchantName,
    notes: input.notes,
    receiptImageUrl: input.receiptImageUrl,
    rawOcrData: (input.rawOcrData as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
  };
}

async function insertTransaction(tx: Tx, userId: string, input: TransactionInput, recurringId: string | null = null) {
  await assertWallet(tx, userId, input.walletId);
  if (input.type === "TRANSFER") {
    if (!input.toWalletId || input.toWalletId === input.walletId) throw badRequest("Kantong asal dan tujuan harus berbeda.");
    await assertWallet(tx, userId, input.toWalletId, "Kantong tujuan");
  } else {
    await assertCategory(tx, userId, input.categoryId);
  }
  const created = await tx.transaction.create({
    data: {
      ...txData(userId, input),
      recurringId,
      items: input.items.length
        ? { create: input.items.map((i) => ({ name: i.name, price: dec(i.price), quantity: i.quantity })) }
        : undefined,
    },
    include: txInclude,
  });
  await applyDeltas(tx, userId, balanceEffects({ ...input, toWalletId: created.toWalletId }));
  return mapTx(created);
}

function buildWhere(f: TransactionFilter): Prisma.TransactionWhereInput {
  const and: Prisma.TransactionWhereInput[] = [{ userId: f.userId }];
  if (f.walletId) and.push(isUuid(f.walletId) ? { OR: [{ walletId: f.walletId }, { toWalletId: f.walletId }] } : { id: { in: [] } });
  if (f.categoryId) and.push(isUuid(f.categoryId) ? { categoryId: f.categoryId } : { id: { in: [] } });
  if (f.type) and.push({ type: f.type });
  if (f.hasReceipt === true) and.push({ receiptImageUrl: { not: null } });
  if (f.hasReceipt === false) and.push({ receiptImageUrl: null });
  if (f.startDate || f.endDate) and.push({ date: { ...(f.startDate ? { gte: f.startDate } : {}), ...(f.endDate ? { lte: f.endDate } : {}) } });
  if (f.search) {
    const contains = { contains: f.search, mode: "insensitive" as const };
    and.push({ OR: [{ merchantName: contains }, { notes: contains }, { category: { name: contains } }] });
  }
  return { AND: and };
}

function orderFor(sortBy: TransactionFilter["sortBy"]): Prisma.TransactionOrderByWithRelationInput[] {
  switch (sortBy) {
    case "date_asc":
      return [{ date: "asc" }, { createdAt: "asc" }];
    case "amount_desc":
      return [{ amount: "desc" }, { date: "desc" }];
    case "amount_asc":
      return [{ amount: "asc" }, { date: "desc" }];
    default:
      return [{ date: "desc" }, { createdAt: "desc" }];
  }
}

async function deleteUserData(tx: Tx, userId: string) {
  await tx.transactionItem.deleteMany({ where: { transaction: { userId } } });
  await tx.transaction.deleteMany({ where: { userId } });
  await tx.recurringTransaction.deleteMany({ where: { userId } });
  await tx.budget.deleteMany({ where: { userId } });
  await tx.wallet.deleteMany({ where: { userId } });
  await tx.category.deleteMany({ where: { userId } });
  await tx.authToken.deleteMany({ where: { userId } });
  await tx.user.delete({ where: { id: userId } });
}

export function createPrismaStore(): FinanceStore {
  return {
    mode: "database",

    /* ---------- users ---------- */

    async findUserByEmail(email) {
      return prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: userSelect });
    },

    async findUserById(id) {
      if (!isUuid(id)) return null;
      return prisma.user.findUnique({ where: { id }, select: userSelect });
    },

    async createUser(data, setup: NewUserSetup) {
      try {
        return await prisma.user.create({
          data: {
            name: data.name,
            email: data.email.toLowerCase(),
            passwordHash: data.passwordHash,
            isDemo: data.isDemo ?? false,
            wallets: { create: setup.wallets.map((w) => ({ name: w.name, balance: dec(w.balance) })) },
            categories: { create: setup.categories },
          },
          select: userSelect,
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw conflict("Email sudah terdaftar. Silakan gunakan email lain atau masuk.");
        }
        throw err;
      }
    },

    async updateUser(id, patch) {
      try {
        return await prisma.user.update({
          where: { id },
          data: {
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.email !== undefined ? { email: patch.email.toLowerCase() } : {}),
            ...(patch.passwordHash !== undefined ? { passwordHash: patch.passwordHash } : {}),
            ...(patch.emailVerifiedAt !== undefined ? { emailVerifiedAt: patch.emailVerifiedAt } : {}),
            ...(patch.bumpSessionVersion ? { sessionVersion: { increment: 1 } } : {}),
          },
          select: userSelect,
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw conflict("Email tersebut sudah dipakai akun lain.");
        }
        throw err;
      }
    },

    async deleteUser(id) {
      await prisma.$transaction((tx) => deleteUserData(tx, id), TX_OPTIONS);
    },

    async deleteDemoUsers(olderThan, limit) {
      const stale = await prisma.user.findMany({
        where: { isDemo: true, createdAt: { lt: olderThan } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
      for (const u of stale) await prisma.$transaction((tx) => deleteUserData(tx, u.id), TX_OPTIONS);
      return stale.map((u) => u.id);
    },

    async importSampleData(userId, data: SampleData) {
      await prisma.$transaction(async (tx) => {
        const categories = await tx.category.findMany({ where: { OR: [{ userId }, { userId: null }] } });
        const catId = (name?: string) => (name ? categories.find((c) => c.name === name)?.id ?? null : null);

        // Sample pockets replace the empty starter pockets.
        await tx.wallet.deleteMany({ where: { userId, transactions: { none: {} }, incomingTransfers: { none: {} } } });
        const walletIds = new Map<string, string>(data.wallets.map((w) => [w.key, crypto.randomUUID()]));
        const balances = new Map<string, number>(data.wallets.map((w) => [walletIds.get(w.key)!, w.balance]));

        const txRows: Prisma.TransactionCreateManyInput[] = [];
        const itemRows: Prisma.TransactionItemCreateManyInput[] = [];
        for (const t of data.transactions) {
          const id = crypto.randomUUID();
          const walletId = walletIds.get(t.walletKey)!;
          const toWalletId = t.toWalletKey ? walletIds.get(t.toWalletKey)! : null;
          for (const [w, d] of Array.from(balanceEffects({ type: t.type, amount: t.amount, walletId, toWalletId }))) {
            balances.set(w, (balances.get(w) ?? 0) + d);
          }
          txRows.push({
            id,
            userId,
            walletId,
            toWalletId,
            categoryId: t.type === "TRANSFER" ? null : catId(t.categoryName),
            amount: dec(t.amount),
            type: t.type,
            date: t.date,
            merchantName: t.merchantName,
            notes: t.notes,
          });
          for (const i of t.items) itemRows.push({ transactionId: id, name: i.name, price: dec(i.price), quantity: i.quantity });
        }

        await tx.wallet.createMany({
          data: data.wallets.map((w) => {
            const id = walletIds.get(w.key)!;
            return { id, userId, name: w.name, balance: dec(balances.get(id) ?? 0) };
          }),
        });
        await tx.transaction.createMany({ data: txRows });
        if (itemRows.length) await tx.transactionItem.createMany({ data: itemRows });

        const budgetRows = data.budgets
          .map((b) => ({ userId, categoryId: catId(b.categoryName), month: b.month, year: b.year, limitAmount: dec(b.limitAmount) }))
          .filter((b): b is typeof b & { categoryId: string } => Boolean(b.categoryId));
        if (budgetRows.length) await tx.budget.createMany({ data: budgetRows, skipDuplicates: true });

        if (data.recurring.length) {
          await tx.recurringTransaction.createMany({
            data: data.recurring.map((r) => ({
              userId,
              walletId: walletIds.get(r.walletKey)!,
              categoryId: catId(r.categoryName),
              type: r.type,
              amount: dec(r.amount),
              merchantName: r.merchantName,
              notes: r.notes,
              frequency: r.frequency,
              interval: r.interval,
              startDate: r.startDate,
              nextRunAt: r.nextRunAt,
              endDate: r.endDate,
              occurrences: r.occurrences,
            })),
          });
        }
      }, TX_OPTIONS);
    },

    /* ---------- one-time tokens ---------- */

    async createAuthToken(data) {
      await prisma.$transaction([
        prisma.authToken.deleteMany({ where: { userId: data.userId, type: data.type, usedAt: null } }),
        prisma.authToken.create({ data }),
      ]);
    },

    async consumeAuthToken(tokenHash, type: AuthTokenKind) {
      const now = new Date();
      const res = await prisma.authToken.updateMany({
        where: { tokenHash, type, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (res.count !== 1) return null;
      const token = await prisma.authToken.findUnique({ where: { tokenHash }, select: { userId: true } });
      return token ? { userId: token.userId } : null;
    },

    /* ---------- rate limiting ---------- */

    async hitRateLimit(key, windowSeconds) {
      const rows = await prisma.$queryRaw<{ count: number; window_start: Date }[]>`
        INSERT INTO rate_limits (key, count, window_start)
        VALUES (${key}, 1, now())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE WHEN rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds}::double precision)
                       THEN 1 ELSE rate_limits.count + 1 END,
          window_start = CASE WHEN rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds}::double precision)
                       THEN now() ELSE rate_limits.window_start END
        RETURNING count, window_start`;
      // Occasionally purge stale counters so the table stays small.
      if (Math.random() < 0.01) {
        await prisma.$executeRaw`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`;
      }
      const row = rows[0];
      return { count: Number(row.count), resetAt: new Date(row.window_start.getTime() + windowSeconds * 1000) };
    },

    /* ---------- pockets ---------- */

    async listWallets(userId) {
      const rows = await prisma.wallet.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { name: "asc" }], include: walletInclude });
      return rows.map(mapWallet);
    },

    async getWallet(userId, id) {
      if (!isUuid(id)) return null;
      const w = await prisma.wallet.findFirst({ where: { id, userId }, include: walletInclude });
      return w ? mapWallet(w) : null;
    },

    async createWallet(userId, data) {
      const w = await prisma.wallet.create({ data: { userId, name: data.name, balance: dec(data.balance) }, include: walletInclude });
      return mapWallet(w);
    },

    async updateWallet(userId, id, data) {
      if (!isUuid(id)) throw notFound("Kantong tidak ditemukan.");
      const res = await prisma.wallet.updateMany({
        where: { id, userId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.balance !== undefined ? { balance: dec(data.balance) } : {}),
        },
      });
      if (res.count !== 1) throw notFound("Kantong tidak ditemukan.");
      return mapWallet(await prisma.wallet.findUniqueOrThrow({ where: { id }, include: walletInclude }));
    },

    async deleteWallet(userId, id, mode: WalletDeleteMode) {
      if (!isUuid(id)) throw notFound("Kantong tidak ditemukan.");
      await prisma.$transaction(async (tx) => {
        // Lock the pocket so no transaction can be added to it while it is removed.
        const locked = await tx.$queryRaw<{ id: string; balance: Prisma.Decimal }[]>`
          SELECT id, balance FROM wallets WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
        if (!locked.length) throw notFound("Kantong tidak ditemukan.");
        if ((await tx.wallet.count({ where: { userId } })) <= 1) {
          throw badRequest("Tidak dapat menghapus kantong terakhir. Akun Anda harus memiliki minimal satu kantong.");
        }
        const used = await tx.transaction.count({ where: { userId, OR: [{ walletId: id }, { toWalletId: id }] } });

        if (mode.kind === "empty" && used > 0) {
          throw conflict(
            `Kantong ini masih memiliki ${used} transaksi. Pindahkan transaksinya ke kantong lain atau hapus semuanya.`
          );
        }

        if (mode.kind === "move" && used > 0) {
          const targetId = mode.targetId;
          if (!isUuid(targetId) || targetId === id) throw badRequest("Pilih kantong tujuan yang berbeda.");
          await assertWallet(tx, userId, targetId, "Kantong tujuan");
          // Transfers between the two pockets would become pocket-to-itself: drop them (net effect is zero).
          const pair = [
            { walletId: id, toWalletId: targetId },
            { walletId: targetId, toWalletId: id },
          ];
          await tx.transactionItem.deleteMany({ where: { transaction: { userId, type: "TRANSFER", OR: pair } } });
          await tx.transaction.deleteMany({ where: { userId, type: "TRANSFER", OR: pair } });
          await tx.recurringTransaction.deleteMany({ where: { userId, type: "TRANSFER", OR: pair } });
          await tx.transaction.updateMany({ where: { userId, walletId: id }, data: { walletId: targetId } });
          await tx.transaction.updateMany({ where: { userId, toWalletId: id }, data: { toWalletId: targetId } });
          await tx.recurringTransaction.updateMany({ where: { userId, walletId: id }, data: { walletId: targetId } });
          await tx.recurringTransaction.updateMany({ where: { userId, toWalletId: id }, data: { toWalletId: targetId } });
          // The remaining money moves with the history.
          await applyDeltas(tx, userId, new Map([[targetId, num(locked[0].balance)]]));
        }

        if (mode.kind === "delete-all" && used > 0) {
          // Transfers with other pockets: undo the other side so those balances stay correct.
          const outgoing = await tx.transaction.groupBy({
            by: ["toWalletId"],
            where: { userId, type: "TRANSFER", walletId: id, toWalletId: { not: id } },
            _sum: { amount: true },
          });
          const incoming = await tx.transaction.groupBy({
            by: ["walletId"],
            where: { userId, type: "TRANSFER", toWalletId: id, walletId: { not: id } },
            _sum: { amount: true },
          });
          const deltas: BalanceDeltas = new Map();
          for (const o of outgoing) if (o.toWalletId) deltas.set(o.toWalletId, (deltas.get(o.toWalletId) ?? 0) - num(o._sum.amount));
          for (const i of incoming) deltas.set(i.walletId, (deltas.get(i.walletId) ?? 0) + num(i._sum.amount));
          await tx.transactionItem.deleteMany({ where: { transaction: { userId, OR: [{ walletId: id }, { toWalletId: id }] } } });
          await tx.transaction.deleteMany({ where: { userId, OR: [{ walletId: id }, { toWalletId: id }] } });
          await applyDeltas(tx, userId, deltas);
        }

        await tx.wallet.delete({ where: { id } });
      }, TX_OPTIONS);
    },

    /* ---------- categories ---------- */

    async listCategories(userId) {
      return prisma.category.findMany({
        where: { OR: [{ userId }, { userId: null }] },
        orderBy: { name: "asc" },
        select: { id: true, userId: true, name: true, icon: true, color: true },
      });
    },

    async createCategory(userId, data) {
      const dup = await prisma.category.findFirst({
        where: { OR: [{ userId }, { userId: null }], name: { equals: data.name, mode: "insensitive" } },
        select: { id: true },
      });
      if (dup) throw conflict("Kategori dengan nama tersebut sudah ada.");
      return prisma.category.create({ data: { ...data, userId }, select: { id: true, userId: true, name: true, icon: true, color: true } });
    },

    async updateCategory(userId, id, data) {
      if (!isUuid(id)) throw notFound("Kategori tidak ditemukan.");
      const cat = await prisma.category.findFirst({ where: { id, OR: [{ userId }, { userId: null }] } });
      if (!cat) throw notFound("Kategori tidak ditemukan.");
      if (cat.userId === null) throw forbidden("Kategori bawaan tidak dapat diubah.");
      if (data.name && data.name.toLowerCase() !== cat.name.toLowerCase()) {
        const dup = await prisma.category.findFirst({
          where: { OR: [{ userId }, { userId: null }], name: { equals: data.name, mode: "insensitive" }, id: { not: id } },
          select: { id: true },
        });
        if (dup) throw conflict("Kategori dengan nama tersebut sudah ada.");
      }
      return prisma.category.update({ where: { id }, data, select: { id: true, userId: true, name: true, icon: true, color: true } });
    },

    async deleteCategory(userId, id) {
      if (!isUuid(id)) throw notFound("Kategori tidak ditemukan.");
      const cat = await prisma.category.findFirst({ where: { id, OR: [{ userId }, { userId: null }] }, select: { userId: true } });
      if (!cat) throw notFound("Kategori tidak ditemukan.");
      if (cat.userId === null) throw forbidden("Kategori bawaan tidak dapat dihapus.");
      // Transactions keep existing without a category (FK: SET NULL); budgets for it are removed (CASCADE).
      await prisma.category.delete({ where: { id } });
    },

    /* ---------- transactions ---------- */

    async listTransactions(filter, page) {
      const where = buildWhere(filter);
      const [total, rows] = await Promise.all([
        prisma.transaction.count({ where }),
        prisma.transaction.findMany({ where, skip: page.skip, take: page.take, orderBy: orderFor(filter.sortBy), include: txInclude }),
      ]);
      return { total, items: rows.map(mapTx) };
    },

    async getTransaction(userId, id) {
      if (!isUuid(id)) return null;
      const row = await prisma.transaction.findFirst({ where: { id, userId }, include: txInclude });
      return row ? mapTx(row) : null;
    },

    async createTransaction(userId, input) {
      return prisma.$transaction((tx) => insertTransaction(tx, userId, input), TX_OPTIONS);
    },

    async updateTransaction(userId, id, patch: TransactionPatch) {
      if (!isUuid(id)) throw notFound("Transaksi tidak ditemukan.");
      return prisma.$transaction(async (tx) => {
        // Row lock: two concurrent edits of the same transaction must not both apply their balance diff.
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM transactions WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
        if (!locked.length) throw notFound("Transaksi tidak ditemukan.");
        const existing = await tx.transaction.findUniqueOrThrow({ where: { id } });

        const type = patch.type ?? existing.type;
        const transfer = type === "TRANSFER";
        const next = {
          type,
          amount: patch.amount ?? num(existing.amount),
          walletId: patch.walletId ?? existing.walletId,
          toWalletId: transfer ? (patch.toWalletId !== undefined ? patch.toWalletId : existing.toWalletId) : null,
          categoryId: transfer ? null : patch.categoryId !== undefined ? patch.categoryId : existing.categoryId,
        };
        if (transfer && (!next.toWalletId || next.toWalletId === next.walletId)) {
          throw badRequest("Transfer membutuhkan kantong tujuan yang berbeda.");
        }
        if (next.walletId !== existing.walletId) await assertWallet(tx, userId, next.walletId);
        if (transfer && next.toWalletId !== existing.toWalletId) await assertWallet(tx, userId, next.toWalletId, "Kantong tujuan");
        if (next.categoryId && next.categoryId !== existing.categoryId) await assertCategory(tx, userId, next.categoryId);

        await applyDeltas(
          tx,
          userId,
          balanceDiff(
            { type: existing.type, amount: num(existing.amount), walletId: existing.walletId, toWalletId: existing.toWalletId },
            next
          )
        );

        if (patch.items !== undefined) {
          await tx.transactionItem.deleteMany({ where: { transactionId: id } });
          if (patch.items.length) {
            await tx.transactionItem.createMany({
              data: patch.items.map((i) => ({ transactionId: id, name: i.name, price: dec(i.price), quantity: i.quantity })),
            });
          }
        }

        const updated = await tx.transaction.update({
          where: { id },
          data: {
            type: next.type,
            amount: dec(next.amount),
            walletId: next.walletId,
            toWalletId: next.toWalletId,
            categoryId: next.categoryId,
            ...(patch.date !== undefined ? { date: patch.date } : {}),
            ...(patch.merchantName !== undefined ? { merchantName: patch.merchantName } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
            ...(patch.receiptImageUrl !== undefined ? { receiptImageUrl: patch.receiptImageUrl } : {}),
            ...(patch.rawOcrData !== undefined
              ? { rawOcrData: (patch.rawOcrData as Prisma.InputJsonValue | null) ?? Prisma.JsonNull }
              : {}),
          },
          include: txInclude,
        });
        return mapTx(updated);
      }, TX_OPTIONS);
    },

    async deleteTransaction(userId, id) {
      if (!isUuid(id)) throw notFound("Transaksi tidak ditemukan.");
      return prisma.$transaction(async (tx) => {
        const existing = await tx.transaction.findFirst({ where: { id, userId }, include: txInclude });
        if (!existing) throw notFound("Transaksi tidak ditemukan.");
        // If a concurrent request already deleted it, this throws and the whole step rolls back.
        await tx.transaction.delete({ where: { id } });
        const record = mapTx(existing);
        await applyDeltas(tx, userId, revertEffects(record));
        return record;
      }, TX_OPTIONS);
    },

    async transactionsBetween(userId, start, end, opts) {
      const rows = await prisma.transaction.findMany({
        where: { userId, date: { gte: start, lte: end } },
        include: opts?.withItems ? txInclude : txLightInclude,
        orderBy: { date: "asc" },
      });
      return rows.map(mapTx);
    },

    async receiptRefs(userId) {
      const rows = await prisma.transaction.findMany({
        where: { userId, receiptImageUrl: { not: null } },
        select: { receiptImageUrl: true },
      });
      return rows.map((r) => r.receiptImageUrl as string);
    },

    /* ---------- budgets ---------- */

    async listBudgets(userId, month, year) {
      const rows = await prisma.budget.findMany({ where: { userId, month, year } });
      return rows.map(mapBudget);
    },

    async listAllBudgets(userId) {
      const rows = await prisma.budget.findMany({ where: { userId }, orderBy: [{ year: "asc" }, { month: "asc" }] });
      return rows.map(mapBudget);
    },

    async upsertBudget(userId, data) {
      return prisma.$transaction(async (tx) => {
        await assertCategory(tx, userId, data.categoryId);
        const row = await tx.budget.upsert({
          where: { userId_categoryId_month_year: { userId, categoryId: data.categoryId, month: data.month, year: data.year } },
          create: { userId, categoryId: data.categoryId, month: data.month, year: data.year, limitAmount: dec(data.limitAmount) },
          update: { limitAmount: dec(data.limitAmount) },
        });
        return mapBudget(row);
      });
    },

    async deleteBudget(userId, id) {
      if (!isUuid(id)) throw notFound("Anggaran tidak ditemukan.");
      const res = await prisma.budget.deleteMany({ where: { id, userId } });
      if (res.count !== 1) throw notFound("Anggaran tidak ditemukan.");
    },

    async copyBudgets(userId, from, to) {
      const source = await prisma.budget.findMany({ where: { userId, month: from.month, year: from.year } });
      if (!source.length) return 0;
      const res = await prisma.budget.createMany({
        data: source.map((b) => ({ userId, categoryId: b.categoryId, month: to.month, year: to.year, limitAmount: b.limitAmount })),
        skipDuplicates: true,
      });
      return res.count;
    },

    /* ---------- recurring ---------- */

    async listRecurring(userId) {
      const rows = await prisma.recurringTransaction.findMany({ where: { userId }, orderBy: [{ active: "desc" }, { nextRunAt: "asc" }] });
      return rows.map(mapRecurring);
    },

    async getRecurring(userId, id) {
      if (!isUuid(id)) return null;
      const r = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
      return r ? mapRecurring(r) : null;
    },

    async createRecurring(userId, data: RecurringInput) {
      return prisma.$transaction(async (tx) => {
        await assertWallet(tx, userId, data.walletId);
        const transfer = data.type === "TRANSFER";
        if (transfer) await assertWallet(tx, userId, data.toWalletId, "Kantong tujuan");
        else await assertCategory(tx, userId, data.categoryId);
        const r = await tx.recurringTransaction.create({
          data: {
            userId,
            walletId: data.walletId,
            toWalletId: transfer ? data.toWalletId : null,
            categoryId: transfer ? null : data.categoryId,
            type: data.type,
            amount: dec(data.amount),
            merchantName: data.merchantName,
            notes: data.notes,
            frequency: data.frequency,
            interval: data.interval,
            startDate: data.startDate,
            nextRunAt: data.nextRunAt,
            endDate: data.endDate,
          },
        });
        return mapRecurring(r);
      });
    },

    async updateRecurring(userId, id, patch: RecurringPatch) {
      if (!isUuid(id)) throw notFound("Transaksi berulang tidak ditemukan.");
      return prisma.$transaction(async (tx) => {
        if (patch.categoryId) await assertCategory(tx, userId, patch.categoryId);
        const res = await tx.recurringTransaction.updateMany({
          where: { id, userId },
          data: {
            ...(patch.active !== undefined ? { active: patch.active } : {}),
            ...(patch.amount !== undefined ? { amount: dec(patch.amount) } : {}),
            ...(patch.merchantName !== undefined ? { merchantName: patch.merchantName } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
            ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
            ...(patch.endDate !== undefined ? { endDate: patch.endDate } : {}),
            ...(patch.nextRunAt !== undefined ? { nextRunAt: patch.nextRunAt } : {}),
            ...(patch.occurrences !== undefined ? { occurrences: patch.occurrences } : {}),
          },
        });
        if (res.count !== 1) throw notFound("Transaksi berulang tidak ditemukan.");
        return mapRecurring(await tx.recurringTransaction.findUniqueOrThrow({ where: { id } }));
      });
    },

    async deleteRecurring(userId, id) {
      if (!isUuid(id)) throw notFound("Transaksi berulang tidak ditemukan.");
      const res = await prisma.recurringTransaction.deleteMany({ where: { id, userId } });
      if (res.count !== 1) throw notFound("Transaksi berulang tidak ditemukan.");
    },

    async listDueRecurring(userId, now, limit) {
      const rows = await prisma.recurringTransaction.findMany({
        where: { active: true, nextRunAt: { lte: now }, ...(userId ? { userId } : {}) },
        orderBy: { nextRunAt: "asc" },
        take: limit,
      });
      return rows.map(mapRecurring);
    },

    async advanceRecurring(a: RecurringAdvance) {
      return prisma.$transaction(async (tx) => {
        const res = await tx.recurringTransaction.updateMany({
          where: { id: a.ruleId, userId: a.userId, active: true, nextRunAt: a.expectedNextRunAt },
          data: { nextRunAt: a.nextRunAt, occurrences: a.occurrences, active: a.active, lastRunAt: new Date() },
        });
        if (res.count !== 1) return false;
        await insertTransaction(tx, a.userId, a.transaction, a.ruleId);
        return true;
      }, TX_OPTIONS);
    },
  };
}
