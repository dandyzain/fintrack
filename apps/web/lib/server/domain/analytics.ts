import type {
  CategoryBudgetComparison,
  CategorySpendingBreakdown,
  DailyExpenseTrend,
  DashboardAnalyticsResponse,
  FinancialHealth,
  FinancialMetrics,
  MonthlyReportPoint,
  ReportCategoryTotal,
  ReportResponse,
} from "@fintrack/shared";
import type { BudgetRecord, CategoryRecord, TransactionRecord } from "../store/types";

/**
 * All analytics are computed here from plain records, so the dashboard shows
 * exactly the same numbers whether data comes from PostgreSQL or memory.
 * Calendar math is done in UTC, matching how dates are stored (midnight UTC).
 * Transfers move money between pockets and are never income or spending.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export function monthRangeUTC(month: number, year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

export function computeMonthlyAnalytics(args: {
  month: number;
  year: number;
  transactions: TransactionRecord[];
  budgets: BudgetRecord[];
  categories: CategoryRecord[];
  now?: Date;
}): DashboardAnalyticsResponse {
  const { month, year, budgets, categories } = args;
  const now = args.now ?? new Date();
  const { start, end } = monthRangeUTC(month, year);
  const txs = args.transactions.filter((t) => t.date >= start && t.date <= end && t.type !== "TRANSFER");
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  let totalExpense = 0;
  let totalIncome = 0;
  let expenseCount = 0;
  let incomeCount = 0;
  let receiptScanCount = 0;
  let receiptScanTotalAmount = 0;
  let largest: TransactionRecord | null = null;
  const byCategory = new Map<string, { total: number; count: number }>();
  const daily = Array.from({ length: daysInMonth }, () => ({ expense: 0, income: 0 }));

  for (const tx of txs) {
    const day = tx.date.getUTCDate() - 1;
    if (tx.type === "EXPENSE") {
      totalExpense += tx.amount;
      expenseCount++;
      daily[day].expense += tx.amount;
      if (!largest || tx.amount > largest.amount) largest = tx;
      if (tx.categoryId) {
        const cur = byCategory.get(tx.categoryId) ?? { total: 0, count: 0 };
        cur.total += tx.amount;
        cur.count++;
        byCategory.set(tx.categoryId, cur);
      }
    } else {
      totalIncome += tx.amount;
      incomeCount++;
      daily[day].income += tx.amount;
    }
    if (tx.receiptImageUrl) {
      receiptScanCount++;
      receiptScanTotalAmount += tx.amount;
    }
  }

  totalExpense = round2(totalExpense);
  totalIncome = round2(totalIncome);
  const netSavings = round2(totalIncome - totalExpense);

  /* Budgets: only categories with a budget can be "over". */
  const budgetComparisons: CategoryBudgetComparison[] = [];
  for (const b of budgets) {
    if (b.month !== month || b.year !== year) continue;
    const cat = categoryById.get(b.categoryId);
    if (!cat) continue;
    const actual = round2(byCategory.get(b.categoryId)?.total ?? 0);
    budgetComparisons.push({
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      categoryColor: cat.color,
      limitAmount: b.limitAmount,
      actualExpense: actual,
      remainingBudget: round2(Math.max(0, b.limitAmount - actual)),
      percentageUsed: b.limitAmount > 0 ? Number(((actual / b.limitAmount) * 100).toFixed(1)) : 0,
      isOverBudget: actual > b.limitAmount,
      hasBudget: true,
      budgetId: b.id,
    });
  }
  budgetComparisons.sort((a, b) => b.percentageUsed - a.percentageUsed || b.actualExpense - a.actualExpense);

  const dailyTrends: DailyExpenseTrend[] = daily.map((d, i) => ({
    date: `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
    day: i + 1,
    expenseAmount: round2(d.expense),
    incomeAmount: round2(d.income),
  }));

  const isCurrentMonth = now.getUTCFullYear() === year && now.getUTCMonth() + 1 === month;
  const isFuture = start > now;
  const daysPassed = isFuture ? 1 : isCurrentMonth ? Math.min(now.getUTCDate(), daysInMonth) : daysInMonth;
  const dailyAverageExpense = Math.round(totalExpense / Math.max(1, daysPassed));
  const savingsRatio = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;
  const expenseToIncomeRatio = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;
  const largestTx = largest as TransactionRecord | null;

  const metrics: FinancialMetrics = {
    dailyAverageExpense,
    averageTransactionAmount: expenseCount > 0 ? Math.round(totalExpense / expenseCount) : 0,
    largestExpense: largestTx
      ? {
          merchantName: largestTx.merchantName,
          amount: largestTx.amount,
          date: largestTx.date.toISOString(),
          categoryName: largestTx.category?.name,
        }
      : null,
    totalTransactions: expenseCount + incomeCount,
    savingsRatio,
    expenseToIncomeRatio,
    projectedMonthEndExpense: isCurrentMonth ? dailyAverageExpense * daysInMonth : totalExpense,
    receiptScanCount,
    receiptScanTotalAmount: round2(receiptScanTotalAmount),
  };

  const categoryBreakdown: CategorySpendingBreakdown[] = Array.from(byCategory.entries())
    .map(([id, v]) => {
      const cat = categoryById.get(id);
      return {
        categoryId: id,
        categoryName: cat?.name ?? "Lainnya",
        categoryIcon: cat?.icon ?? "Tag",
        categoryColor: cat?.color ?? "#6B7280",
        totalAmount: round2(v.total),
        percentage: totalExpense > 0 ? Number(((v.total / totalExpense) * 100).toFixed(1)) : 0,
        transactionCount: v.count,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    summary: { month, year, totalExpense, totalIncome, netSavings, expenseCount, incomeCount },
    budgetComparisons,
    dailyTrends,
    metrics,
    categoryBreakdown,
    financialHealth: computeHealth(totalIncome, totalExpense, savingsRatio, expenseToIncomeRatio, budgetComparisons),
  };
}

function computeHealth(
  income: number,
  expense: number,
  savingsRatio: number,
  expenseRatio: number,
  budgets: CategoryBudgetComparison[]
): FinancialHealth {
  let score = income === 0 && expense === 0 ? 0 : 70;
  if (income > 0) {
    if (savingsRatio >= 60) score = 98;
    else if (savingsRatio >= 40) score = 90;
    else if (savingsRatio >= 20) score = 82;
    else if (savingsRatio >= 5) score = 72;
    else score = 45;
  } else if (expense > 0) {
    score = 35;
  }
  const overCount = budgets.filter((b) => b.isOverBudget).length;
  if (overCount > 0) score = Math.max(30, score - Math.min(25, overCount * 8));

  if (score >= 90)
    return {
      score,
      status: "EXCELLENT",
      label: "Sangat Prima",
      message: `Rasio tabungan Anda mencapai ${savingsRatio}%. Pertahankan disiplin finansial ini.`,
    };
  if (score >= 75)
    return {
      score,
      status: "HEALTHY",
      label: "Sehat & Stabil",
      message: `Pengeluaran bulan ini berada pada batas wajar (${expenseRatio}% dari pemasukan).`,
    };
  if (score >= 50)
    return {
      score,
      status: "WARNING",
      label: "Perlu Perhatian",
      message: "Pengeluaran mendekati atau melampaui anggaran di beberapa kategori.",
    };
  return {
    score,
    status: "CRITICAL",
    label: "Defisit Pengeluaran",
    message: "Pengeluaran melebihi pemasukan bulan ini. Tinjau kembali pos pengeluaran prioritas.",
  };
}

/** Last `count` months ending at (endMonth, endYear), oldest first. */
export function monthWindow(endMonth: number, endYear: number, count: number): { month: number; year: number }[] {
  const out: { month: number; year: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const total = endYear * 12 + (endMonth - 1) - i;
    out.push({ year: Math.floor(total / 12), month: (total % 12) + 1 });
  }
  return out;
}

export function computeReport(args: {
  endMonth: number;
  endYear: number;
  months: number;
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
  now?: Date;
}): ReportResponse {
  const window = monthWindow(args.endMonth, args.endYear, args.months);
  const index = new Map(window.map((w, i) => [`${w.year}-${w.month}`, i]));
  const points = window.map((w) => ({ ...w, income: 0, expense: 0 }));
  const categoryById = new Map(args.categories.map((c) => [c.id, c]));
  const byCategory = new Map<string, { total: number; series: number[] }>();

  for (const tx of args.transactions) {
    if (tx.type === "TRANSFER") continue;
    const i = index.get(`${tx.date.getUTCFullYear()}-${tx.date.getUTCMonth() + 1}`);
    if (i === undefined) continue;
    if (tx.type === "INCOME") {
      points[i].income += tx.amount;
      continue;
    }
    points[i].expense += tx.amount;
    const key = tx.categoryId ?? "__none__";
    const cur = byCategory.get(key) ?? { total: 0, series: new Array(window.length).fill(0) };
    cur.total += tx.amount;
    cur.series[i] += tx.amount;
    byCategory.set(key, cur);
  }

  const months: MonthlyReportPoint[] = points.map((p) => {
    const income = round2(p.income);
    const expense = round2(p.expense);
    const net = round2(income - expense);
    return {
      month: p.month,
      year: p.year,
      key: `${p.year}-${String(p.month).padStart(2, "0")}`,
      income,
      expense,
      net,
      savingsRate: income > 0 ? Math.round((net / income) * 100) : 0,
    };
  });

  const income = round2(months.reduce((s, m) => s + m.income, 0));
  const expense = round2(months.reduce((s, m) => s + m.expense, 0));
  const active = months.filter((m) => m.income > 0 || m.expense > 0);
  // The month in progress isn't over yet, so it doesn't compete for best/toughest month.
  const now = args.now ?? new Date();
  const currentKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const complete = active.filter((m) => m.key < currentKey);
  const ranked = [...(complete.length ? complete : active)].sort((a, b) => b.net - a.net);

  const categories: ReportCategoryTotal[] = Array.from(byCategory.entries())
    .map(([id, v]) => {
      const cat = id === "__none__" ? null : categoryById.get(id);
      return {
        categoryId: id === "__none__" ? null : id,
        categoryName: cat?.name ?? (id === "__none__" ? "Tanpa kategori" : "Lainnya"),
        categoryColor: cat?.color ?? "#94A3B8",
        categoryIcon: cat?.icon ?? "Tag",
        total: round2(v.total),
        percentage: expense > 0 ? Number(((v.total / expense) * 100).toFixed(1)) : 0,
        series: v.series.map(round2),
      };
    })
    .sort((a, b) => b.total - a.total);

  const divisor = Math.max(1, active.length);
  return {
    months,
    categories,
    totals: {
      income,
      expense,
      net: round2(income - expense),
      averageMonthlyIncome: Math.round(income / divisor),
      averageMonthlyExpense: Math.round(expense / divisor),
      savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
      bestMonth: ranked[0]?.key ?? null,
      worstMonth: ranked.length > 1 ? ranked[ranked.length - 1].key : null,
    },
  };
}
