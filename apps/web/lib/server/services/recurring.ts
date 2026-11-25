import type { CreateRecurringInput, UpdateRecurringInput } from "@fintrack/shared";
import { MAX_CATCH_UP, firstOccurrenceOnOrAfter, occurrenceDate, startOfDayUTC } from "../domain/recurrence";
import { log } from "../logger";
import { getStore } from "../store";
import type { RecurringPatch, RecurringRecord } from "../store/types";
import { parseDateInput } from "../dates";
import { notFound } from "../errors";

const blankToNull = (v: string | null | undefined) => (v == null || v.trim() === "" ? null : v.trim());

export async function createRecurring(userId: string, v: CreateRecurringInput) {
  const startDate = startOfDayUTC(parseDateInput(v.startDate));
  const transfer = v.type === "TRANSFER";
  return getStore().createRecurring(userId, {
    walletId: v.walletId,
    toWalletId: transfer ? v.toWalletId ?? null : null,
    categoryId: transfer ? null : blankToNull(v.categoryId),
    type: v.type,
    amount: v.amount,
    merchantName: blankToNull(v.merchantName),
    notes: blankToNull(v.notes),
    frequency: v.frequency,
    interval: v.interval,
    startDate,
    // The first occurrence is the start date itself (past start dates are backfilled, up to MAX_CATCH_UP).
    nextRunAt: startDate,
    endDate: v.endDate ? startOfDayUTC(parseDateInput(v.endDate)) : null,
  });
}

export async function updateRecurring(userId: string, id: string, v: UpdateRecurringInput) {
  const store = getStore();
  const rule = await store.getRecurring(userId, id);
  if (!rule) throw notFound("Transaksi berulang tidak ditemukan.");

  const patch: RecurringPatch = {};
  if (v.amount !== undefined) patch.amount = v.amount;
  if (v.merchantName !== undefined) patch.merchantName = blankToNull(v.merchantName);
  if (v.notes !== undefined) patch.notes = blankToNull(v.notes);
  if (v.categoryId !== undefined && rule.type !== "TRANSFER") patch.categoryId = blankToNull(v.categoryId);
  if (v.endDate !== undefined) patch.endDate = v.endDate ? startOfDayUTC(parseDateInput(v.endDate)) : null;
  if (v.active !== undefined) {
    patch.active = v.active;
    // Resuming skips the occurrences missed while paused instead of creating them all at once.
    if (v.active && !rule.active) {
      const next = firstOccurrenceOnOrAfter(rule.startDate, rule.frequency, rule.interval, new Date());
      if (next.index > rule.occurrences) {
        patch.occurrences = next.index;
        patch.nextRunAt = next.date;
      }
    }
  }
  return store.updateRecurring(userId, id, patch);
}

/** The transaction an occurrence produces. */
function occurrenceInput(rule: RecurringRecord, date: Date) {
  return {
    walletId: rule.walletId,
    toWalletId: rule.toWalletId,
    categoryId: rule.categoryId,
    amount: rule.amount,
    type: rule.type,
    date,
    merchantName: rule.merchantName,
    notes: rule.notes,
    receiptImageUrl: null,
    rawOcrData: null,
    items: [],
  };
}

/**
 * Materialises every due occurrence (bounded per call). Safe to call from many
 * requests at once: each occurrence is claimed atomically by the store.
 * Called before reading the ledger/analytics, and by the daily cron.
 */
export async function processDueRecurring(userId: string | null, now: Date = new Date()): Promise<number> {
  const store = getStore();
  let created = 0;
  try {
    const due = await store.listDueRecurring(userId, now, userId ? 20 : 200);
    for (const initial of due) {
      let rule = initial;
      for (let i = 0; i < MAX_CATCH_UP && rule.active && rule.nextRunAt <= now; i++) {
        const runDate = rule.nextRunAt;
        const nextIndex = rule.occurrences + 1;
        const nextRunAt = occurrenceDate(rule.startDate, rule.frequency, rule.interval, nextIndex);
        const endReached = rule.endDate !== null && runDate > rule.endDate;
        const active = !endReached && (rule.endDate === null || nextRunAt <= rule.endDate);

        if (endReached) {
          await store.updateRecurring(rule.userId, rule.id, { active: false });
          break;
        }
        const claimed = await store.advanceRecurring({
          ruleId: rule.id,
          userId: rule.userId,
          expectedNextRunAt: runDate,
          nextRunAt,
          occurrences: nextIndex,
          active,
          transaction: occurrenceInput(rule, runDate),
        });
        if (!claimed) break; // another request handled it
        created++;
        rule = { ...rule, nextRunAt, occurrences: nextIndex, active };
      }
    }
  } catch (err) {
    // A broken rule (e.g. its pocket was deleted concurrently) must not break the ledger.
    log.warn("recurring_processing_failed", { userId, message: (err as Error).message });
  }
  return created;
}
