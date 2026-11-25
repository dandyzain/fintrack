import type { AuthUser, DashboardAnalyticsResponse, ReceiptExtraction } from "@fintrack/shared";

/**
 * Typed client for the existing Route Handlers. Shapes mirror what the API
 * returns today (Prisma Decimals arrive as strings, hence `number | string`).
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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

  let json: { success?: boolean; data?: T; error?: string } | null = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (res.status === 401 && redirectOn401 && typeof window !== "undefined") {
    window.location.replace("/login");
    throw new ApiError(json?.error || "Unauthorized", 401);
  }
  if (!res.ok || !json?.success) {
    throw new ApiError(json?.error || `Request failed (${res.status})`, res.status);
  }
  return json.data as T;
}

export type Money = number | string;

export interface Wallet {
  id: string;
  name: string;
  balance: Money;
}

export interface Category {
  id: string;
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
  type: "EXPENSE" | "INCOME";
  date: string;
  walletId: string;
  categoryId: string | null;
  merchantName: string | null;
  notes: string | null;
  receiptImageUrl: string | null;
  wallet: { id?: string; name: string };
  category: { id?: string; name: string; color: string; icon?: string } | null;
  items?: TransactionLineItem[];
}

export interface TransactionPage {
  items: Transaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface TransactionQuery {
  search?: string;
  type?: "ALL" | "EXPENSE" | "INCOME";
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
  categoryId: string | null;
  amount: number;
  type: "EXPENSE" | "INCOME";
  date: string;
  merchantName: string | null;
  notes: string | null;
  receiptImageUrl?: string | null;
  rawOcrData?: Record<string, unknown> | null;
  items?: { name: string; price: number; quantity: number }[];
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

export const endpoints = {
  me: () => api<{ user: AuthUser }>("/api/auth/me").then((d) => d.user),
  wallets: () => api<Wallet[]>("/api/wallets"),
  categories: () => api<Category[]>("/api/categories"),
  analytics: (month: number, year: number) =>
    api<DashboardAnalyticsResponse>(`/api/analytics?month=${month}&year=${year}`),
  transactions: (q: TransactionQuery, page = 1) =>
    api<TransactionPage>(`/api/transactions?${transactionSearchParams(q, page)}`),
  transaction: (id: string) => api<Transaction>(`/api/transactions/${id}`),
  createTransaction: (input: TransactionInput) =>
    api<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(input) }),
  updateTransaction: (id: string, input: Partial<TransactionInput>) =>
    api<Transaction>(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteTransaction: (id: string) => api<unknown>(`/api/transactions/${id}`, { method: "DELETE" }),
  createWallet: (name: string, balance: number) =>
    api<Wallet>("/api/wallets", { method: "POST", body: JSON.stringify({ name, balance }) }),
  deleteWallet: (id: string) => api<unknown>(`/api/wallets/${id}`, { method: "DELETE" }),
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
  logout: () => fetch("/api/auth/logout", { method: "POST" }),
};
