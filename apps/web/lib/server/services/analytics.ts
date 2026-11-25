import { computeMonthlyAnalytics, computeReport, monthRangeUTC, monthWindow } from "../domain/analytics";
import { getStore } from "../store";
import { processDueRecurring } from "./recurring";

export async function monthlyAnalytics(userId: string, month: number, year: number) {
  await processDueRecurring(userId);
  const store = getStore();
  const { start, end } = monthRangeUTC(month, year);
  const [transactions, budgets, categories] = await Promise.all([
    store.transactionsBetween(userId, start, end),
    store.listBudgets(userId, month, year),
    store.listCategories(userId),
  ]);
  return computeMonthlyAnalytics({ month, year, transactions, budgets, categories });
}

export async function report(userId: string, endMonth: number, endYear: number, months: number) {
  await processDueRecurring(userId);
  const store = getStore();
  const window = monthWindow(endMonth, endYear, months);
  const start = monthRangeUTC(window[0].month, window[0].year).start;
  const end = monthRangeUTC(endMonth, endYear).end;
  const [transactions, categories] = await Promise.all([store.transactionsBetween(userId, start, end), store.listCategories(userId)]);
  return computeReport({ endMonth, endYear, months, transactions, categories });
}
