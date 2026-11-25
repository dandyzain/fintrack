import type { RecurrenceFrequency, TransactionType } from "@fintrack/shared";

/**
 * Plain records returned by every store implementation. Money is a JS number
 * (two decimals; amounts are capped far below 2^53) so the UI and the mobile
 * app never have to deal with Prisma Decimal strings.
 */

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  isDemo: boolean;
  sessionVersion: number;
  createdAt: Date;
}

export interface WalletRecord {
  id: string;
  userId: string;
  name: string;
  balance: number;
  createdAt: Date;
  /** Transactions that use this pocket as source or destination. */
  transactionCount: number;
}

export interface CategoryRecord {
  id: string;
  /** null = built-in category shared by everyone (read-only). */
  userId: string | null;
  name: string;
  icon: string;
  color: string;
}

export interface TransactionItemRecord {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  recurringId: string | null;
  amount: number;
  type: TransactionType;
  date: Date;
  merchantName: string | null;
  notes: string | null;
  /** Storage reference (path) of the receipt; resolved to a signed URL by the API. */
  receiptImageUrl: string | null;
  rawOcrData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  wallet: { id: string; name: string };
  toWallet: { id: string; name: string } | null;
  category: { id: string; name: string; icon: string; color: string } | null;
  items: TransactionItemRecord[];
}

export interface BudgetRecord {
  id: string;
  userId: string;
  categoryId: string;
  limitAmount: number;
  month: number;
  year: number;
}

export interface RecurringRecord {
  id: string;
  userId: string;
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  merchantName: string | null;
  notes: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: Date;
  nextRunAt: Date;
  endDate: Date | null;
  occurrences: number;
  active: boolean;
  lastRunAt: Date | null;
  createdAt: Date;
}

export type AuthTokenKind = "PASSWORD_RESET" | "EMAIL_VERIFICATION";

/** Transaction fields after validation, owner taken from the session. */
export interface TransactionInput {
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  amount: number;
  type: TransactionType;
  date: Date;
  merchantName: string | null;
  notes: string | null;
  receiptImageUrl: string | null;
  rawOcrData: Record<string, unknown> | null;
  items: { name: string; price: number; quantity: number }[];
}

export type TransactionPatch = Partial<Omit<TransactionInput, "items">> & {
  items?: TransactionInput["items"];
};

export interface TransactionFilter {
  userId: string;
  walletId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  hasReceipt?: boolean;
  sortBy?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
}

export type WalletDeleteMode = { kind: "empty" } | { kind: "move"; targetId: string } | { kind: "delete-all" };

export interface RecurringInput {
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  merchantName: string | null;
  notes: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: Date;
  nextRunAt: Date;
  endDate: Date | null;
}

export interface RecurringPatch {
  active?: boolean;
  amount?: number;
  merchantName?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  endDate?: Date | null;
  nextRunAt?: Date;
  /** Index of the next occurrence (slots consumed, whether materialised or skipped). */
  occurrences?: number;
}

/** Result of advancing a recurring rule by one occurrence. */
export interface RecurringAdvance {
  ruleId: string;
  userId: string;
  /** The rule's nextRunAt the caller saw; the advance only happens if it still matches. */
  expectedNextRunAt: Date;
  nextRunAt: Date;
  /** New value of the rule's `occurrences` index. */
  occurrences: number;
  active: boolean;
  transaction: TransactionInput;
}

export interface SampleData {
  wallets: { key: string; name: string; balance: number }[];
  budgets: { categoryName: string; month: number; year: number; limitAmount: number }[];
  transactions: (Omit<TransactionInput, "walletId" | "toWalletId" | "categoryId"> & {
    walletKey: string;
    toWalletKey?: string;
    categoryName?: string;
  })[];
  recurring: (Omit<RecurringInput, "walletId" | "toWalletId" | "categoryId"> & {
    walletKey: string;
    categoryName?: string;
    occurrences: number;
  })[];
}

export interface NewUserSetup {
  wallets: { name: string; balance: number }[];
  categories: { name: string; icon: string; color: string }[];
}

export interface FinanceStore {
  readonly mode: "database" | "memory";

  /* users */
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  /** Creates the user with starter pockets and categories in one atomic step. */
  createUser(
    data: { name: string; email: string; passwordHash: string | null; isDemo?: boolean },
    setup: NewUserSetup
  ): Promise<UserRecord>;
  updateUser(
    id: string,
    patch: {
      name?: string;
      email?: string;
      passwordHash?: string;
      emailVerifiedAt?: Date | null;
      bumpSessionVersion?: boolean;
    }
  ): Promise<UserRecord>;
  /** Deletes the user and every row they own. */
  deleteUser(id: string): Promise<void>;
  /** Removes demo sandboxes created before `olderThan`. Returns their ids. */
  deleteDemoUsers(olderThan: Date, limit: number): Promise<string[]>;
  /** Bulk-inserts the demo sample data (pockets, transactions, budgets, rules). */
  importSampleData(userId: string, data: SampleData): Promise<void>;

  /* one-time tokens */
  createAuthToken(data: { userId: string; type: AuthTokenKind; tokenHash: string; expiresAt: Date }): Promise<void>;
  /** Marks the token used and returns its user, or null if unknown/used/expired. */
  consumeAuthToken(tokenHash: string, type: AuthTokenKind): Promise<{ userId: string } | null>;

  /* rate limiting (fixed window) */
  hitRateLimit(key: string, windowSeconds: number): Promise<{ count: number; resetAt: Date }>;

  /* pockets */
  listWallets(userId: string): Promise<WalletRecord[]>;
  getWallet(userId: string, id: string): Promise<WalletRecord | null>;
  createWallet(userId: string, data: { name: string; balance: number }): Promise<WalletRecord>;
  updateWallet(userId: string, id: string, data: { name?: string; balance?: number }): Promise<WalletRecord>;
  deleteWallet(userId: string, id: string, mode: WalletDeleteMode): Promise<void>;

  /* categories */
  listCategories(userId: string): Promise<CategoryRecord[]>;
  createCategory(userId: string, data: { name: string; icon: string; color: string }): Promise<CategoryRecord>;
  updateCategory(userId: string, id: string, data: { name?: string; icon?: string; color?: string }): Promise<CategoryRecord>;
  deleteCategory(userId: string, id: string): Promise<void>;

  /* transactions */
  listTransactions(
    filter: TransactionFilter,
    page: { skip: number; take: number }
  ): Promise<{ items: TransactionRecord[]; total: number }>;
  getTransaction(userId: string, id: string): Promise<TransactionRecord | null>;
  createTransaction(userId: string, input: TransactionInput): Promise<TransactionRecord>;
  updateTransaction(userId: string, id: string, patch: TransactionPatch): Promise<TransactionRecord>;
  /** Returns the deleted record so callers can clean up its receipt file. */
  deleteTransaction(userId: string, id: string): Promise<TransactionRecord>;
  /** Every transaction (any type) dated within [start, end]. */
  transactionsBetween(userId: string, start: Date, end: Date, opts?: { withItems?: boolean }): Promise<TransactionRecord[]>;
  /** Receipt references of every transaction of the user (for account deletion). */
  receiptRefs(userId: string): Promise<string[]>;

  /* budgets */
  listBudgets(userId: string, month: number, year: number): Promise<BudgetRecord[]>;
  listAllBudgets(userId: string): Promise<BudgetRecord[]>;
  upsertBudget(
    userId: string,
    data: { categoryId: string; month: number; year: number; limitAmount: number }
  ): Promise<BudgetRecord>;
  deleteBudget(userId: string, id: string): Promise<void>;
  copyBudgets(
    userId: string,
    from: { month: number; year: number },
    to: { month: number; year: number }
  ): Promise<number>;

  /* recurring */
  listRecurring(userId: string): Promise<RecurringRecord[]>;
  getRecurring(userId: string, id: string): Promise<RecurringRecord | null>;
  createRecurring(userId: string, data: RecurringInput): Promise<RecurringRecord>;
  updateRecurring(userId: string, id: string, patch: RecurringPatch): Promise<RecurringRecord>;
  deleteRecurring(userId: string, id: string): Promise<void>;
  /** Active rules due at `now` (for one user, or for everyone when userId is null). */
  listDueRecurring(userId: string | null, now: Date, limit: number): Promise<RecurringRecord[]>;
  /**
   * Atomically creates the occurrence's transaction and moves the rule forward,
   * but only if the rule's nextRunAt still equals `expectedNextRunAt`. Returns
   * false when another request already did it (so occurrences are never doubled).
   */
  advanceRecurring(advance: RecurringAdvance): Promise<boolean>;
}
