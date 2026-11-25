"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  endpoints,
  type RecurringInput,
  type Transaction,
  type TransactionInput,
  type TransactionPage,
  type TransactionQuery,
  type WalletDeleteOption,
} from "./client";
import type { Period } from "@/lib/period";
import { useLanguage } from "@/context/language-context";

import { queryKeys } from "./keys";
export { queryKeys };

/** Anything that changes money refreshes balances, analytics, reports and lists. */
export function invalidateFinance(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.wallets }),
    qc.invalidateQueries({ queryKey: ["analytics"] }),
    qc.invalidateQueries({ queryKey: ["report"] }),
    qc.invalidateQueries({ queryKey: ["budgets"] }),
    qc.invalidateQueries({ queryKey: queryKeys.transactions }),
    qc.invalidateQueries({ queryKey: ["transaction"] }),
  ]);
}

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: endpoints.me, staleTime: 5 * 60_000, retry: false });
}

export function useWallets() {
  return useQuery({ queryKey: queryKeys.wallets, queryFn: endpoints.wallets });
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: endpoints.categories, staleTime: 10 * 60_000 });
}

export function useAnalytics(period: Period, enabled = true) {
  return useQuery({
    queryKey: queryKeys.analytics(period),
    queryFn: () => endpoints.analytics(period.month, period.year),
    // Keep showing the previous month while the next one loads (no layout jump).
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useRecentTransactions(q: TransactionQuery) {
  return useQuery({
    queryKey: queryKeys.recent(q),
    queryFn: () => endpoints.transactions(q, 1),
    placeholderData: (prev) => prev,
  });
}

export function useTransactionList(q: TransactionQuery) {
  return useInfiniteQuery({
    queryKey: queryKeys.transactionList(q),
    queryFn: ({ pageParam }) => endpoints.transactions(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    placeholderData: (prev) => prev,
  });
}

export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: queryKeys.transaction(id ?? ""),
    queryFn: () => endpoints.transaction(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) => endpoints.createTransaction(input),
    onSuccess: () => invalidateFinance(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionInput> }) =>
      endpoints.updateTransaction(id, input),
    onSuccess: () => invalidateFinance(qc),
  });
}

export function useCreateWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, balance }: { name: string; balance: number }) => endpoints.createWallet(name, balance),
    onSuccess: () => invalidateFinance(qc),
  });
}

export function useUpdateWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; balance?: number } }) => endpoints.updateWallet(id, input),
    onSuccess: () => invalidateFinance(qc),
  });
}

export function useDeleteWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, option }: { id: string; option?: WalletDeleteOption }) => endpoints.deleteWallet(id, option),
    onSuccess: () => Promise.all([invalidateFinance(qc), qc.invalidateQueries({ queryKey: queryKeys.recurring })]),
  });
}

/* ---------- categories ---------- */

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: endpoints.createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<{ name: string; icon: string; color: string }> }) =>
      endpoints.updateCategory(id, input),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: queryKeys.categories }), invalidateFinance(qc)]),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => endpoints.deleteCategory(id),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: queryKeys.categories }), invalidateFinance(qc)]),
  });
}

/* ---------- budgets ---------- */

export function useBudgets(period: Period) {
  return useQuery({
    queryKey: queryKeys.budgets(period),
    queryFn: () => endpoints.budgets(period.month, period.year),
    placeholderData: (prev) => prev,
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: endpoints.upsertBudget, onSuccess: () => invalidateFinance(qc) });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => endpoints.deleteBudget(id), onSuccess: () => invalidateFinance(qc) });
}

export function useCopyBudgets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ from, to }: { from: Period; to: Period }) => endpoints.copyBudgets(from, to),
    onSuccess: () => invalidateFinance(qc),
  });
}

/* ---------- recurring ---------- */

export function useRecurring() {
  return useQuery({ queryKey: queryKeys.recurring, queryFn: endpoints.recurring });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecurringInput) => endpoints.createRecurring(input),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: queryKeys.recurring }), invalidateFinance(qc)]),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<{ active: boolean; amount: number; endDate: string | null }> }) =>
      endpoints.updateRecurring(id, input),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: queryKeys.recurring }), invalidateFinance(qc)]),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => endpoints.deleteRecurring(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.recurring }),
  });
}

/* ---------- reports ---------- */

export function useReport(period: Period, months: number) {
  return useQuery({
    queryKey: queryKeys.report(period, months),
    queryFn: () => endpoints.report(period.month, period.year, months),
    placeholderData: (prev) => prev,
  });
}

export function useScanReceipt() {
  return useMutation({ mutationFn: (file: File) => endpoints.scanReceipt(file) });
}

/* ---------- Delete with Undo (deferred commit) ---------- */

type ListCache = InfiniteData<TransactionPage, number> | TransactionPage | undefined;

function withoutTransaction(data: ListCache, id: string): ListCache {
  if (!data) return data;
  if ("pages" in data) {
    return {
      ...data,
      pages: data.pages.map((p) => ({
        ...p,
        items: p.items.filter((t) => t.id !== id),
        pagination: { ...p.pagination, total: Math.max(0, p.pagination.total - 1) },
      })),
    };
  }
  return {
    ...data,
    items: data.items.filter((t) => t.id !== id),
    pagination: { ...data.pagination, total: Math.max(0, data.pagination.total - 1) },
  };
}

const UNDO_WINDOW_MS = 5000;

/**
 * Removes the row immediately and shows an Undo toast. The DELETE request is
 * only sent once the undo window closes (or the page is hidden), so "Undo"
 * needs no backend support.
 */
export function useDeleteTransactionWithUndo() {
  const qc = useQueryClient();
  const { t } = useLanguage();

  return (tx: Pick<Transaction, "id">, onRemoved?: () => void) => {
    const snapshots = qc.getQueriesData<ListCache>({ queryKey: queryKeys.transactions });
    qc.setQueriesData<ListCache>({ queryKey: queryKeys.transactions }, (old) => withoutTransaction(old, tx.id));
    onRemoved?.();

    let settled = false;
    const restore = () => snapshots.forEach(([key, data]) => qc.setQueryData(key, data));

    const commit = async () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("pagehide", onPageHide);
      window.clearTimeout(timer);
      try {
        await endpoints.deleteTransaction(tx.id);
      } catch {
        restore();
        toast.error(t.transactions.deleteFailed);
      } finally {
        invalidateFinance(qc);
      }
    };

    const onPageHide = () => {
      if (settled) return;
      settled = true;
      fetch(`/api/transactions/${tx.id}`, { method: "DELETE", keepalive: true });
    };

    window.addEventListener("pagehide", onPageHide);
    const timer = window.setTimeout(commit, UNDO_WINDOW_MS);

    toast(t.transactions.deleted, {
      duration: UNDO_WINDOW_MS,
      action: {
        label: t.common.undo,
        onClick: () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          window.removeEventListener("pagehide", onPageHide);
          restore();
          toast.success(t.transactions.restored);
        },
      },
      onDismiss: () => void commit(),
    });
  };
}
