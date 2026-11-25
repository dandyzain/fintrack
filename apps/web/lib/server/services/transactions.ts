import type { CreateTransactionInput, TransactionQueryInput, UpdateTransactionInput } from "@fintrack/shared";
import { parseDateInput } from "../dates";
import { deleteReceipts, normalizeReceiptRef, resolveReceiptUrls } from "../receipts";
import { getStore } from "../store";
import type { TransactionFilter, TransactionInput, TransactionPatch, TransactionRecord } from "../store/types";
import { processDueRecurring } from "./recurring";

const blankToNull = (v: string | null | undefined) => (v === undefined || v === null || v.trim() === "" ? null : v.trim());

export function toTransactionInput(v: CreateTransactionInput, userId: string): TransactionInput {
  const transfer = v.type === "TRANSFER";
  return {
    walletId: v.walletId,
    toWalletId: transfer ? v.toWalletId ?? null : null,
    categoryId: transfer ? null : blankToNull(v.categoryId),
    amount: v.amount,
    type: v.type,
    date: parseDateInput(v.date),
    merchantName: blankToNull(v.merchantName),
    notes: blankToNull(v.notes),
    receiptImageUrl: normalizeReceiptRef(v.receiptImageUrl, userId),
    rawOcrData: v.rawOcrData ?? null,
    items: v.items ?? [],
  };
}

export function toTransactionPatch(v: UpdateTransactionInput, userId: string): TransactionPatch {
  const patch: TransactionPatch = {};
  if (v.walletId !== undefined) patch.walletId = v.walletId;
  if (v.toWalletId !== undefined) patch.toWalletId = v.toWalletId;
  if (v.categoryId !== undefined) patch.categoryId = blankToNull(v.categoryId);
  if (v.amount !== undefined) patch.amount = v.amount;
  if (v.type !== undefined) patch.type = v.type;
  if (v.date !== undefined) patch.date = parseDateInput(v.date);
  if (v.merchantName !== undefined) patch.merchantName = blankToNull(v.merchantName);
  if (v.notes !== undefined) patch.notes = blankToNull(v.notes);
  if (v.receiptImageUrl !== undefined) patch.receiptImageUrl = normalizeReceiptRef(v.receiptImageUrl, userId);
  if (v.rawOcrData !== undefined) patch.rawOcrData = v.rawOcrData ?? null;
  // Line items are only replaced when the client actually sent them.
  if (v.items !== undefined) patch.items = v.items;
  return patch;
}

export function toFilter(q: TransactionQueryInput, userId: string): TransactionFilter {
  const end = q.endDate ? parseDateInput(q.endDate) : undefined;
  // A date-only end bound includes that whole day.
  if (end && q.endDate && /^\d{4}-\d{2}-\d{2}$/.test(q.endDate)) end.setUTCHours(23, 59, 59, 999);
  return {
    userId,
    walletId: q.walletId,
    categoryId: q.categoryId,
    type: q.type,
    startDate: q.startDate ? parseDateInput(q.startDate) : undefined,
    endDate: end,
    search: q.search || undefined,
    hasReceipt: q.hasReceipt === "true" ? true : q.hasReceipt === "false" ? false : undefined,
    sortBy: q.sortBy,
  };
}

export type ApiTransaction = Omit<TransactionRecord, "receiptImageUrl"> & {
  receiptImageUrl: string | null;
  hasReceipt: boolean;
};

/** Replaces stored receipt paths with short-lived signed URLs. */
export async function serializeTransactions(records: TransactionRecord[]): Promise<ApiTransaction[]> {
  const urls = await resolveReceiptUrls(records.map((r) => r.receiptImageUrl));
  return records.map((r) => ({
    ...r,
    receiptImageUrl: r.receiptImageUrl ? urls.get(r.receiptImageUrl) ?? null : null,
    hasReceipt: Boolean(r.receiptImageUrl),
  }));
}

export async function listTransactions(userId: string, q: TransactionQueryInput) {
  await processDueRecurring(userId);
  const { items, total } = await getStore().listTransactions(toFilter(q, userId), {
    skip: (q.page - 1) * q.limit,
    take: q.limit,
  });
  return {
    items: await serializeTransactions(items),
    pagination: { page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) },
  };
}

export async function deleteTransaction(userId: string, id: string) {
  const deleted = await getStore().deleteTransaction(userId, id);
  if (deleted.receiptImageUrl) await deleteReceipts([deleted.receiptImageUrl]);
  return { success: true, deletedId: id };
}
