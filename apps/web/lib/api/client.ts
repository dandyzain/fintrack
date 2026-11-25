import type { AuthUser, DashboardAnalyticsResponse, ReceiptExtraction, ReportResponse } from "@fintrack/shared";

/** Typed client for the Route Handlers. Money arrives as numbers. */

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends RequestInit {
  /** Redirect to /login on 401 (default true). */
  redirectOn401?: boolean;
}

export async function api<T>(path: string, { redirectOn401 = true, headers, body, ...init }: RequestOptions = {}): Promise<T> {
  const isJsonBody = body !== undefined && !(body instanceof FormData);
  const res = await fetch(path, {
    ...init,
    body,
    headers: { ...(isJsonBody ? { "Content-Type": "application/json" } : {}), ...headers },
  });

  let json: { success?: boolean; data?: T; error?: string; code?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (res.status === 401 && redirectOn401 && typeof window !== "undefined") {
    // The server already cleared the stale cookie, so /login won't bounce back.
    const next = window.location.pathname + window.location.search;
    window.location.replace(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
    throw new ApiError(json?.error || "Unauthorized", 401, json?.code);
  }
  if (!res.ok || !json?.success) {
    throw new ApiError(json?.error || `Request failed (${res.status})`, res.status, json?.code);
  }
  return json.data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export type Money = number | string;
export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

export interface MeResponse {
  user: AuthUser;
  storage: "database" | "memory";
  emailDelivery: boolean;
}

export interface Wallet {
  id: string;
  name: string;
  balance: Money;
  transactionCount?: number;
}

export interface Category {
  id: string;
  userId?: string | null;
  name: string;
  icon: string;
  color: string;
}

export interface TransactionLineItem {
  id?: string;
  name: string;
  price: Money;
  quantity: number;
}

export interface Transaction {
  id: string;
  amount: Money;
  type: TransactionType;
  date: string;
  walletId: string;
  toWalletId?: string | null;
  categoryId: string | null;
  recurringId?: string | null;
  merchantName: string | null;
  notes: string | null;
  receiptImageUrl: string | null;
  hasReceipt?: boolean;
  wallet: { id?: string; name: string };
  toWallet?: { id: string; name: string } | null;
  category: { id?: string; name: string; color: string; icon?: string } | null;
  items?: TransactionLineItem[];
}

export interface TransactionPage {
  items: Transaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface TransactionQuery {
  search?: string;
  type?: "ALL" | TransactionType;
  walletId?: string;
  categoryId?: string;
  hasReceiptOnly?: boolean;
  sortBy?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface TransactionInput {
  walletId: string;
  toWalletId?: string | null;
  categoryId: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  merchantName: string | null;
  notes: string | null;
  receiptImageUrl?: string | null;
  rawOcrData?: Record<string, unknown> | null;
  items?: { name: string; price: number; quantity: number }[];
}

export interface Budget {
  id: string;
  categoryId: string;
  limitAmount: number;
  month: number;
  year: number;
}

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurringRule {
  id: string;
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  merchantName: string | null;
  notes: string | null;
  frequency: Frequency;
  interval: number;
  startDate: string;
  nextRunAt: string;
  endDate: string | null;
  active: boolean;
  lastRunAt: string | null;
}

export interface RecurringInput {
  walletId: string;
  toWalletId?: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amount: number;
  merchantName?: string | null;
  notes?: string | null;
  frequency: Frequency;
  interval: number;
  startDate: string;
  endDate?: string | null;
}

export interface ScanResult {
  extraction: ReceiptExtraction;
  receiptImageUrl: string | null;
  rawOcrData: Record<string, unknown> | null;
}

export function transactionSearchParams(q: TransactionQuery, page = 1): string {
  const p = new URLSearchParams();
  p.set("limit", String(q.limit ?? 20));
  p.set("page", String(page));
  if (q.search?.trim()) p.set("search", q.search.trim());
  if (q.type && q.type !== "ALL") p.set("type", q.type);
  if (q.walletId) p.set("walletId", q.walletId);
  if (q.categoryId) p.set("categoryId", q.categoryId);
  if (q.hasReceiptOnly) p.set("hasReceipt", "true");
  if (q.sortBy) p.set("sortBy", q.sortBy);
  if (q.startDate) p.set("startDate", q.startDate);
  if (q.endDate) p.set("endDate", q.endDate);
  return p.toString();
}

/** Server-side CSV of every transaction matching the filters (no row cap). */
export function transactionsCsvUrl(q: TransactionQuery, lang: "en" | "id"): string {
  const p = new URLSearchParams(transactionSearchParams(q, 1));
  p.delete("page");
  p.delete("limit");
  p.set("lang", lang);
  return `/api/transactions/export?${p.toString()}`;
}

export type WalletDeleteOption = { mode?: undefined } | { mode: "move"; targetId: string } | { mode: "delete-all" };

export const endpoints = {
  /* session & account */
  me: () => api<MeResponse>("/api/auth/me"),
  logout: (everywhere = false) => fetch("/api/auth/logout", { method: "POST", body: JSON.stringify({ everywhere }), headers: { "Content-Type": "application/json" } }),
  updateProfile: (input: { name?: string; email?: string; currentPassword?: string }) =>
    api<{ user: AuthUser }>("/api/account", json("PATCH", input)),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ user: AuthUser }>("/api/account/password", json("POST", { currentPassword, newPassword })),
  resendVerification: () => api<{ sent: boolean }>("/api/account/verify-email", json("POST", {})),
  deleteAccount: (password: string | undefined) =>
    api<null>("/api/account", json("DELETE", { password, confirm: "DELETE" })),

  /* pockets */
  wallets: () => api<Wallet[]>("/api/wallets"),
  createWallet: (name: string, balance: number) => api<Wallet>("/api/wallets", json("POST", { name, balance })),
  updateWallet: (id: string, input: { name?: string; balance?: number }) => api<Wallet>(`/api/wallets/${id}`, json("PATCH", input)),
  deleteWallet: (id: string, opt: WalletDeleteOption = {}) => {
    const p = new URLSearchParams();
    if (opt.mode) p.set("mode", opt.mode);
    if (opt.mode === "move") p.set("targetId", opt.targetId);
    const qs = p.toString();
    return api<null>(`/api/wallets/${id}${qs ? `?${qs}` : ""}`, { method: "DELETE" });
  },

  /* categories */
  categories: () => api<Category[]>("/api/categories"),
  createCategory: (input: { name: string; icon: string; color: string }) => api<Category>("/api/categories", json("POST", input)),
  updateCategory: (id: string, input: Partial<{ name: string; icon: string; color: string }>) =>
    api<Category>(`/api/categories/${id}`, json("PATCH", input)),
  deleteCategory: (id: string) => api<null>(`/api/categories/${id}`, { method: "DELETE" }),

  /* transactions */
  analytics: (month: number, year: number) => api<DashboardAnalyticsResponse>(`/api/analytics?month=${month}&year=${year}`),
  report: (month: number, year: number, months: number) =>
    api<ReportResponse>(`/api/reports?month=${month}&year=${year}&months=${months}`),
  transactions: (q: TransactionQuery, page = 1) => api<TransactionPage>(`/api/transactions?${transactionSearchParams(q, page)}`),
  transaction: (id: string) => api<Transaction>(`/api/transactions/${id}`),
  createTransaction: (input: TransactionInput) => api<Transaction>("/api/transactions", json("POST", input)),
  updateTransaction: (id: string, input: Partial<TransactionInput>) => api<Transaction>(`/api/transactions/${id}`, json("PUT", input)),
  deleteTransaction: (id: string) => api<unknown>(`/api/transactions/${id}`, { method: "DELETE" }),

  /* budgets */
  budgets: (month: number, year: number) => api<Budget[]>(`/api/budgets?month=${month}&year=${year}`),
  upsertBudget: (input: { categoryId: string; month: number; year: number; limitAmount: number }) =>
    api<Budget>("/api/budgets", json("PUT", input)),
  deleteBudget: (id: string) => api<null>(`/api/budgets/${id}`, { method: "DELETE" }),
  copyBudgets: (from: { month: number; year: number }, to: { month: number; year: number }) =>
    api<{ copied: number }>("/api/budgets/copy", json("POST", { from, to })),

  /* recurring */
  recurring: () => api<RecurringRule[]>("/api/recurring"),
  createRecurring: (input: RecurringInput) =>
    api<{ rule: RecurringRule; createdTransactions: number }>("/api/recurring", json("POST", input)),
  updateRecurring: (id: string, input: Partial<{ active: boolean; amount: number; endDate: string | null }>) =>
    api<RecurringRule>(`/api/recurring/${id}`, json("PATCH", input)),
  deleteRecurring: (id: string) => api<null>(`/api/recurring/${id}`, { method: "DELETE" }),

  /* receipts */
  scanReceipt: async (file: File): Promise<ScanResult> => {
    const form = new FormData();
    form.append("file", file);
    const data = await api<{
      extractedData?: ReceiptExtraction;
      extraction?: ReceiptExtraction;
      receiptImageUrl?: string | null;
      rawOcrData?: Record<string, unknown> | null;
    }>("/api/receipts/scan", { method: "POST", body: form });
    return {
      extraction: (data.extractedData || data.extraction) as ReceiptExtraction,
      receiptImageUrl: data.receiptImageUrl || null,
      rawOcrData: data.rawOcrData || null,
    };
  },
};
