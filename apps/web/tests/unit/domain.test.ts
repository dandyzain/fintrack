import { describe, expect, it } from "vitest";
import { balanceDiff, balanceEffects } from "@/lib/server/domain/balance";
import { firstOccurrenceOnOrAfter, occurrenceDate } from "@/lib/server/domain/recurrence";
import { computeMonthlyAnalytics, computeReport, monthWindow } from "@/lib/server/domain/analytics";
import { buildSampleData } from "@/lib/server/domain/sample-data";
import type { TransactionRecord } from "@/lib/server/store/types";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe("balance rules", () => {
  it("maps each type to pocket deltas", () => {
    expect(Object.fromEntries(balanceEffects({ type: "EXPENSE", amount: 5, walletId: "a", toWalletId: null }))).toEqual({ a: -5 });
    expect(Object.fromEntries(balanceEffects({ type: "INCOME", amount: 5, walletId: "a", toWalletId: null }))).toEqual({ a: 5 });
    expect(Object.fromEntries(balanceEffects({ type: "TRANSFER", amount: 5, walletId: "a", toWalletId: "b" }))).toEqual({ a: -5, b: 5 });
  });

  it("diffs edits without floating-point drift", () => {
    const diff = balanceDiff(
      { type: "EXPENSE", amount: 0.1, walletId: "a", toWalletId: null },
      { type: "EXPENSE", amount: 0.3, walletId: "a", toWalletId: null }
    );
    expect(Object.fromEntries(diff)).toEqual({ a: -0.2 });
    expect(balanceDiff({ type: "INCOME", amount: 1, walletId: "a", toWalletId: null }, { type: "INCOME", amount: 1, walletId: "a", toWalletId: null }).size).toBe(0);
  });
});

describe("recurrence", () => {
  it("anchors monthly schedules to the start day (no month-end drift)", () => {
    const dates = [0, 1, 2, 3].map((i) => iso(occurrenceDate(d("2026-01-31"), "MONTHLY", 1, i)));
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(iso(occurrenceDate(d("2024-02-29"), "YEARLY", 1, 1))).toBe("2025-02-28");
    expect(iso(occurrenceDate(d("2026-11-25"), "WEEKLY", 2, 1))).toBe("2026-12-09");
    expect(iso(occurrenceDate(d("2026-12-01"), "MONTHLY", 3, 1))).toBe("2027-03-01");
  });

  it("finds the next occurrence after a pause", () => {
    const next = firstOccurrenceOnOrAfter(d("2026-01-15"), "MONTHLY", 1, d("2026-05-20"));
    expect([next.index, iso(next.date)]).toEqual([5, "2026-06-15"]);
  });
});

const tx = (p: Partial<TransactionRecord>): TransactionRecord => ({
  id: Math.random().toString(36),
  userId: "u",
  walletId: "w",
  toWalletId: null,
  categoryId: null,
  recurringId: null,
  amount: 0,
  type: "EXPENSE",
  date: d("2026-11-10"),
  merchantName: null,
  notes: null,
  receiptImageUrl: null,
  rawOcrData: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  wallet: { id: "w", name: "W" },
  toWallet: null,
  category: null,
  items: [],
  ...p,
});

describe("monthly analytics", () => {
  const categories = [
    { id: "food", userId: "u", name: "Food", icon: "Utensils", color: "#f00" },
    { id: "fun", userId: "u", name: "Fun", icon: "Film", color: "#0f0" },
  ];

  it("only flags categories with a budget as over budget and ignores transfers", () => {
    const a = computeMonthlyAnalytics({
      month: 11,
      year: 2026,
      now: d("2026-11-20"),
      categories,
      budgets: [{ id: "b1", userId: "u", categoryId: "food", limitAmount: 100, month: 11, year: 2026 }],
      transactions: [
        tx({ amount: 150, categoryId: "food" }),
        tx({ amount: 40, categoryId: "fun" }),
        tx({ amount: 1000, type: "INCOME" }),
        tx({ amount: 500, type: "TRANSFER", toWalletId: "w2" }),
        tx({ amount: 999, date: d("2026-10-31") }),
      ],
    });
    expect(a.summary).toMatchObject({ totalExpense: 190, totalIncome: 1000, netSavings: 810, expenseCount: 2, incomeCount: 1 });
    expect(a.budgetComparisons).toHaveLength(1);
    expect(a.budgetComparisons[0]).toMatchObject({ categoryId: "food", isOverBudget: true, hasBudget: true, percentageUsed: 150 });
    expect(a.categoryBreakdown?.map((c) => c.categoryId)).toEqual(["food", "fun"]);
    expect(a.metrics?.dailyAverageExpense).toBe(Math.round(190 / 20));
    expect(a.financialHealth?.score).toBe(90); // 81% savings (98) minus one category over budget (8)
    expect(a.dailyTrends).toHaveLength(30);
  });

  it("scores an empty month as 0 instead of 'healthy'", () => {
    const a = computeMonthlyAnalytics({ month: 11, year: 2026, categories, budgets: [], transactions: [] });
    expect(a.financialHealth?.score).toBe(0);
  });
});

describe("reports", () => {
  it("builds a month window across a year boundary", () => {
    expect(monthWindow(2, 2027, 4)).toEqual([
      { month: 11, year: 2026 },
      { month: 12, year: 2026 },
      { month: 1, year: 2027 },
      { month: 2, year: 2027 },
    ]);
  });

  it("aggregates monthly totals and category series", () => {
    const r = computeReport({
      endMonth: 12,
      endYear: 2026,
      months: 3,
      categories: [{ id: "food", userId: "u", name: "Food", icon: "Utensils", color: "#f00" }],
      transactions: [
        tx({ amount: 100, categoryId: "food", date: d("2026-10-05") }),
        tx({ amount: 50, date: d("2026-12-05") }),
        tx({ amount: 400, type: "INCOME", date: d("2026-12-01") }),
        tx({ amount: 999, type: "TRANSFER", toWalletId: "x", date: d("2026-12-02") }),
      ],
    });
    expect(r.months.map((m) => [m.key, m.income, m.expense])).toEqual([
      ["2026-10", 0, 100],
      ["2026-11", 0, 0],
      ["2026-12", 400, 50],
    ]);
    expect(r.categories[0]).toMatchObject({ categoryId: "food", total: 100, series: [100, 0, 0] });
    expect(r.categories[1]).toMatchObject({ categoryId: null, total: 50 });
    expect(r.totals).toMatchObject({ income: 400, expense: 150, bestMonth: "2026-12", worstMonth: "2026-10" });
  });
});

describe("demo sample data", () => {
  it("never contains future-dated transactions", () => {
    const now = new Date("2026-11-04T10:00:00Z");
    const data = buildSampleData(now);
    expect(data.transactions.length).toBeGreaterThan(20);
    expect(data.transactions.every((t) => t.date <= now)).toBe(true);
    expect(data.recurring.every((r) => r.nextRunAt > now)).toBe(true);
  });
});
