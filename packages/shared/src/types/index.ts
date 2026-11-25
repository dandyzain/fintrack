export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** Machine-readable error code, e.g. "UNAUTHORIZED", "RATE_LIMITED". */
  code?: string;
  message?: string;
  details?: unknown;
}

export interface MonthlySummary {
  month: number;
  year: number;
  totalExpense: number;
  totalIncome: number;
  netSavings: number;
  expenseCount: number;
  incomeCount: number;
}

export interface CategoryBudgetComparison {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  limitAmount: number;
  actualExpense: number;
  remainingBudget: number;
  percentageUsed: number;
  isOverBudget: boolean;
  /** False for categories with spending but no budget set (they are never "over"). */
  hasBudget: boolean;
  budgetId?: string | null;
}

export interface DailyExpenseTrend {
  date: string; // ISO format: YYYY-MM-DD
  day: number;
  expenseAmount: number;
  incomeAmount: number;
}

export interface FinancialMetrics {
  dailyAverageExpense: number;
  averageTransactionAmount: number;
  largestExpense: {
    merchantName: string | null;
    amount: number;
    date: string;
    categoryName?: string;
  } | null;
  totalTransactions: number;
  savingsRatio: number;
  expenseToIncomeRatio: number;
  projectedMonthEndExpense: number;
  receiptScanCount: number;
  receiptScanTotalAmount: number;
}

export interface CategorySpendingBreakdown {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export interface FinancialHealth {
  score: number; // 0 - 100
  status: "EXCELLENT" | "HEALTHY" | "WARNING" | "CRITICAL";
  label: string;
  message: string;
}

export interface DashboardAnalyticsResponse {
  summary: MonthlySummary;
  budgetComparisons: CategoryBudgetComparison[];
  dailyTrends: DailyExpenseTrend[];
  metrics?: FinancialMetrics;
  categoryBreakdown?: CategorySpendingBreakdown[];
  financialHealth?: FinancialHealth;
}

/* ---------- Reports (multi-month) ---------- */

export interface MonthlyReportPoint {
  month: number;
  year: number;
  /** YYYY-MM */
  key: string;
  income: number;
  expense: number;
  net: number;
  /** Net savings as a share of income (0 when there is no income). */
  savingsRate: number;
}

export interface ReportCategoryTotal {
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  total: number;
  percentage: number;
  /** Monthly totals aligned with `months`. */
  series: number[];
}

export interface ReportResponse {
  months: MonthlyReportPoint[];
  categories: ReportCategoryTotal[];
  totals: {
    income: number;
    expense: number;
    net: number;
    averageMonthlyIncome: number;
    averageMonthlyExpense: number;
    savingsRate: number;
    bestMonth: string | null;
    worstMonth: string | null;
  };
}
