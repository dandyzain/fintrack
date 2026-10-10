import crypto from "crypto";
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryInput,
  DashboardAnalyticsResponse,
  MonthlySummary,
  CategoryBudgetComparison,
  DailyExpenseTrend,
  FinancialMetrics,
  CategorySpendingBreakdown,
  FinancialHealth,
} from "@fintrack/shared";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface DemoWallet {
  id: string;
  userId: string;
  name: string;
  balance: number;
}

export interface DemoCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface DemoTransactionItem {
  id: string;
  transactionId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface DemoTransaction {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string | null;
  amount: number;
  type: "EXPENSE" | "INCOME";
  date: Date;
  merchantName: string | null;
  notes: string | null;
  receiptImageUrl: string | null;
  rawOcrData: any;
  items: DemoTransactionItem[];
}

export interface DemoBudget {
  id: string;
  userId: string;
  categoryId: string;
  limitAmount: number;
  month: number;
  year: number;
}

class DemoStoreSingleton {
  public userId = "a0000000-0000-0000-0000-000000000001";
  public users: DemoUser[] = [];
  public wallets: DemoWallet[] = [];
  public categories: DemoCategory[] = [];
  public budgets: DemoBudget[] = [];
  public transactions: DemoTransaction[] = [];

  constructor() {
    this.initDemoData();
  }

  private initDemoData() {
    const demoSalt = "demo-salt-pastel-fintrack-2026";
    const demoPasswordHash = crypto
      .pbkdf2Sync("password123", demoSalt, 1000, 64, "sha512")
      .toString("hex");

    // Seed Demo User
    this.users = [
      {
        id: this.userId,
        name: "Dandy Zain",
        email: "dandy@example.com",
        passwordHash: demoPasswordHash,
        salt: demoSalt,
        createdAt: new Date().toISOString(),
      },
    ];

    // Seed Demo Wallets for default user
    this.wallets = [
      { id: "w-1", userId: this.userId, name: "BCA Tabungan", balance: 5000000 },
      { id: "w-2", userId: this.userId, name: "Dompet Tunai (Cash)", balance: 450000 },
      { id: "w-3", userId: this.userId, name: "GoPay / OVO", balance: 350000 },
    ];

    // Standard Categories
    this.categories = [
      { id: "c-1", name: "Makanan & Minuman", icon: "Utensils", color: "#F97316" },
      { id: "c-2", name: "Belanja Bulanan", icon: "ShoppingCart", color: "#10B981" },
      { id: "c-3", name: "Transportasi", icon: "Car", color: "#3B82F6" },
      { id: "c-4", name: "Kesehatan", icon: "HeartPulse", color: "#EC4899" },
      { id: "c-5", name: "Hiburan", icon: "Film", color: "#8B5CF6" },
      { id: "c-6", name: "Lainnya", icon: "Tag", color: "#6B7280" },
    ];

    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    // Default Budgets for default user
    this.budgets = [
      { id: "b-1", userId: this.userId, categoryId: "c-1", limitAmount: 2500000, month: curMonth, year: curYear },
      { id: "b-2", userId: this.userId, categoryId: "c-2", limitAmount: 3000000, month: curMonth, year: curYear },
      { id: "b-3", userId: this.userId, categoryId: "c-3", limitAmount: 800000, month: curMonth, year: curYear },
      { id: "b-4", userId: this.userId, categoryId: "c-5", limitAmount: 600000, month: curMonth, year: curYear },
    ];

    // Seed realistic transactions for default user
    const d1 = new Date(curYear, curMonth - 1, Math.min(2, now.getDate()));
    const d2 = new Date(curYear, curMonth - 1, Math.min(5, now.getDate()));
    const d3 = new Date(curYear, curMonth - 1, Math.min(8, now.getDate()));
    const d4 = new Date(curYear, curMonth - 1, Math.min(10, now.getDate()));

    this.transactions = [
      {
        id: "tx-demo-1",
        userId: this.userId,
        walletId: "w-1",
        categoryId: null,
        amount: 8500000,
        type: "INCOME",
        date: d1,
        merchantName: "PT Teknologi Mandiri (Payroll)",
        notes: "Gaji bulanan",
        receiptImageUrl: null,
        rawOcrData: null,
        items: [],
      },
      {
        id: "tx-demo-2",
        userId: this.userId,
        walletId: "w-1",
        categoryId: "c-2",
        amount: 465000,
        type: "EXPENSE",
        date: d2,
        merchantName: "Superindo Mall Kelapa Gading",
        notes: "Belanja bahan pokok mingguan",
        receiptImageUrl: "https://images.unsplash.com/photo-1554415707-9e4466b404c0?w=600&auto=format&fit=crop",
        rawOcrData: null,
        items: [
          { id: "i-1", transactionId: "tx-demo-2", name: "Beras Premium 5kg", price: 74000, quantity: 1 },
          { id: "i-2", transactionId: "tx-demo-2", name: "Daging Sapi Segar 500g", price: 68000, quantity: 1 },
          { id: "i-3", transactionId: "tx-demo-2", name: "Minyak Goreng 2L", price: 34000, quantity: 2 },
        ],
      },
      {
        id: "tx-demo-3",
        userId: this.userId,
        walletId: "w-2",
        categoryId: "c-1",
        amount: 58000,
        type: "EXPENSE",
        date: d3,
        merchantName: "Kopi Kenangan Senopati",
        notes: "Kopi & Roti sarapan",
        receiptImageUrl: "https://images.unsplash.com/photo-1554415707-9e4466b404c0?w=600&auto=format&fit=crop",
        rawOcrData: null,
        items: [
          { id: "i-4", transactionId: "tx-demo-3", name: "Kopi Kenangan Mantan Large", price: 28000, quantity: 1 },
          { id: "i-5", transactionId: "tx-demo-3", name: "Roti Coklat Klasik", price: 15000, quantity: 2 },
        ],
      },
      {
        id: "tx-demo-4",
        userId: this.userId,
        walletId: "w-3",
        categoryId: "c-3",
        amount: 45000,
        type: "EXPENSE",
        date: d4,
        merchantName: "Grab Transport",
        notes: "Ongkos ke kantor",
        receiptImageUrl: null,
        rawOcrData: null,
        items: [],
      },
    ];
  }

  // --- Auth Methods ---
  public registerUser(
    name: string,
    email: string,
    password: string
  ): { id: string; name: string; email: string; createdAt: string } {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error("Email sudah terdaftar. Silakan gunakan email lain atau masuk.");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");

    const id = `u-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const createdAt = new Date().toISOString();

    const newUser: DemoUser = {
      id,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      salt,
      createdAt,
    };

    this.users.push(newUser);

    // Automatically provision initial starter wallets for the new registered user
    this.wallets.push(
      { id: `w-${Date.now()}-1`, userId: id, name: "Rekening Bank", balance: 0 },
      { id: `w-${Date.now()}-2`, userId: id, name: "Dompet Tunai", balance: 0 },
      { id: `w-${Date.now()}-3`, userId: id, name: "E-Wallet", balance: 0 }
    );

    return { id, name: newUser.name, email: newUser.email, createdAt };
  }

  public loginUser(
    email: string,
    password: string
  ): { id: string; name: string; email: string; createdAt: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error("Email atau kata sandi tidak cocok.");
    }

    const testHash = crypto
      .pbkdf2Sync(password, user.salt, 1000, 64, "sha512")
      .toString("hex");

    if (testHash !== user.passwordHash) {
      throw new Error("Email atau kata sandi tidak cocok.");
    }

    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  }

  public getUserById(
    id: string
  ): { id: string; name: string; email: string; createdAt: string } | null {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  }

  // --- Wallet Methods ---
  public getWallets(userId?: string): DemoWallet[] {
    const targetId = userId || this.userId;
    return this.wallets.filter((w) => w.userId === targetId);
  }

  public createWallet(userId: string, name: string, balance: number): DemoWallet {
    const targetId = userId || this.userId;
    const newWallet: DemoWallet = {
      id: `w-${Date.now()}`,
      userId: targetId,
      name,
      balance,
    };
    this.wallets.push(newWallet);
    return newWallet;
  }

  public deleteWallet(userId: string, walletId: string): boolean {
    const targetId = userId || this.userId;
    const userWallets = this.wallets.filter((w) => w.userId === targetId);
    if (userWallets.length <= 1) {
      throw new Error("Tidak dapat menghapus kantong terakhir. Akun Anda harus memiliki minimal satu kantong.");
    }
    const index = this.wallets.findIndex(
      (w) => w.id === walletId && w.userId === targetId
    );
    if (index === -1) {
      throw new Error("Kantong tidak ditemukan.");
    }
    this.transactions = this.transactions.filter(
      (t) => !(t.walletId === walletId && t.userId === targetId)
    );
    this.wallets.splice(index, 1);
    return true;
  }

  // --- Category Methods ---
  public getCategories(_userId?: string): DemoCategory[] {
    return [...this.categories];
  }

  // --- Transaction Methods ---
  public createTransaction(input: CreateTransactionInput & { userId: string }) {
    const wallet = this.wallets.find(
      (w) => w.id === input.walletId && w.userId === input.userId
    ) || this.wallets.find((w) => w.id === input.walletId);

    if (!wallet) throw new Error("Dompet tidak ditemukan.");

    const amount = Number(input.amount);
    if (input.type === "EXPENSE") {
      wallet.balance -= amount;
    } else {
      wallet.balance += amount;
    }

    const txId = `tx-${Date.now()}`;
    const newTx: DemoTransaction = {
      id: txId,
      userId: input.userId,
      walletId: input.walletId,
      categoryId: input.categoryId || null,
      amount,
      type: input.type as "EXPENSE" | "INCOME",
      date: new Date(input.date),
      merchantName: input.merchantName || null,
      notes: input.notes || null,
      receiptImageUrl: input.receiptImageUrl || null,
      rawOcrData: input.rawOcrData || null,
      items: (input.items || []).map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        transactionId: txId,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
      })),
    };

    this.transactions.unshift(newTx);
    return this.enrichTransaction(newTx);
  }

  public updateTransaction(input: UpdateTransactionInput & { userId: string }) {
    const existing = this.transactions.find(
      (t) => t.id === input.id && t.userId === input.userId
    );
    if (!existing) throw new Error("Transaksi tidak ditemukan.");

    const oldWallet = this.wallets.find((w) => w.id === existing.walletId);
    if (oldWallet) {
      if (existing.type === "EXPENSE") oldWallet.balance += existing.amount;
      else oldWallet.balance -= existing.amount;
    }

    const targetWalletId = input.walletId || existing.walletId;
    const targetWallet = this.wallets.find((w) => w.id === targetWalletId);
    if (!targetWallet) throw new Error("Dompet tujuan tidak ditemukan.");

    const targetAmount =
      input.amount !== undefined ? Number(input.amount) : existing.amount;
    const targetType = (input.type as "EXPENSE" | "INCOME") || existing.type;

    if (targetType === "EXPENSE") targetWallet.balance -= targetAmount;
    else targetWallet.balance += targetAmount;

    existing.walletId = targetWalletId;
    existing.categoryId =
      input.categoryId !== undefined ? input.categoryId : existing.categoryId;
    existing.amount = targetAmount;
    existing.type = targetType;
    if (input.date) existing.date = new Date(input.date);
    if (input.merchantName !== undefined) existing.merchantName = input.merchantName;
    if (input.notes !== undefined) existing.notes = input.notes;
    if (input.receiptImageUrl !== undefined)
      existing.receiptImageUrl = input.receiptImageUrl;

    return this.enrichTransaction(existing);
  }

  public deleteTransaction(id: string, userId?: string) {
    const idx = this.transactions.findIndex(
      (t) => t.id === id && (!userId || t.userId === userId)
    );
    if (idx === -1) throw new Error("Transaksi tidak ditemukan.");

    const tx = this.transactions[idx];
    const wallet = this.wallets.find((w) => w.id === tx.walletId);
    if (wallet) {
      if (tx.type === "EXPENSE") wallet.balance += tx.amount;
      else wallet.balance -= tx.amount;
    }

    this.transactions.splice(idx, 1);
    return { success: true, deletedId: id };
  }

  public getTransactions(query: TransactionQueryInput & { userId?: string }) {
    const targetUser = query.userId || this.userId;
    let list = this.transactions.filter((t) => t.userId === targetUser);

    if (query.walletId) list = list.filter((t) => t.walletId === query.walletId);
    if (query.categoryId) list = list.filter((t) => t.categoryId === query.categoryId);
    if (query.type) list = list.filter((t) => t.type === query.type);
    if (query.hasReceipt === "true") {
      list = list.filter((t) => Boolean(t.receiptImageUrl));
    } else if (query.hasReceipt === "false") {
      list = list.filter((t) => !t.receiptImageUrl);
    }
    if (query.startDate) {
      const start = new Date(query.startDate);
      list = list.filter((t) => t.date >= start);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((t) => t.date <= end);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.merchantName && t.merchantName.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    if (query.sortBy === "date_asc") {
      list.sort((a, b) => a.date.getTime() - b.date.getTime());
    } else if (query.sortBy === "amount_desc") {
      list.sort((a, b) => b.amount - a.amount);
    } else if (query.sortBy === "amount_asc") {
      list.sort((a, b) => a.amount - b.amount);
    } else {
      list.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const paged = list.slice(skip, skip + limit);

    return {
      items: paged.map((t) => this.enrichTransaction(t)),
      pagination: {
        page,
        limit,
        total: list.length,
        totalPages: Math.ceil(list.length / limit) || 1,
      },
    };
  }

  public getTransactionById(id: string, userId?: string) {
    const tx = this.transactions.find(
      (t) => t.id === id && (!userId || t.userId === userId)
    );
    return tx ? this.enrichTransaction(tx) : null;
  }

  public getMonthlyAnalytics(
    month: number,
    year: number,
    userId?: string
  ): DashboardAnalyticsResponse {
    const targetUser = userId || this.userId;
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    let totalExpense = 0;
    let totalIncome = 0;
    let expenseCount = 0;
    let incomeCount = 0;

    const categoryExpenseMap = new Map<string, number>();
    const dailyMap = new Map<number, { expense: number; income: number }>();
    for (let d = 1; d <= totalDaysInMonth; d++) {
      dailyMap.set(d, { expense: 0, income: 0 });
    }

    // Filter strictly by targetUser
    for (const tx of this.transactions) {
      if (tx.userId !== targetUser) continue;

      const txMonth = tx.date.getMonth() + 1;
      const txYear = tx.date.getFullYear();
      if (txMonth !== month || txYear !== year) continue;

      const txDay = tx.date.getDate();
      if (tx.type === "EXPENSE") {
        totalExpense += tx.amount;
        expenseCount++;
        if (tx.categoryId) {
          categoryExpenseMap.set(
            tx.categoryId,
            (categoryExpenseMap.get(tx.categoryId) || 0) + tx.amount
          );
        }
        const rec = dailyMap.get(txDay);
        if (rec) rec.expense += tx.amount;
      } else {
        totalIncome += tx.amount;
        incomeCount++;
        const rec = dailyMap.get(txDay);
        if (rec) rec.income += tx.amount;
      }
    }

    const budgetComparisons: CategoryBudgetComparison[] = [];
    const processedCats = new Set<string>();

    const userBudgets = this.budgets.filter((b) => b.userId === targetUser);

    for (const b of userBudgets) {
      if (b.month !== month || b.year !== year) continue;
      const cat = this.categories.find((c) => c.id === b.categoryId);
      if (!cat) continue;

      const actual = categoryExpenseMap.get(b.categoryId) || 0;
      const remaining = Math.max(0, b.limitAmount - actual);
      const percentageUsed = b.limitAmount > 0 ? (actual / b.limitAmount) * 100 : 0;

      budgetComparisons.push({
        categoryId: b.categoryId,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
        limitAmount: b.limitAmount,
        actualExpense: actual,
        remainingBudget: remaining,
        percentageUsed: Number(percentageUsed.toFixed(1)),
        isOverBudget: actual > b.limitAmount,
      });
      processedCats.add(b.categoryId);
    }

    for (const [catId, val] of Array.from(categoryExpenseMap.entries())) {
      if (!processedCats.has(catId)) {
        const cat = this.categories.find((c) => c.id === catId);
        if (cat) {
          budgetComparisons.push({
            categoryId: cat.id,
            categoryName: cat.name,
            categoryIcon: cat.icon,
            categoryColor: cat.color,
            limitAmount: 0,
            actualExpense: val,
            remainingBudget: 0,
            percentageUsed: 100,
            isOverBudget: true,
          });
        }
      }
    }

    budgetComparisons.sort((a, b) => b.actualExpense - a.actualExpense);

    const dailyTrends: DailyExpenseTrend[] = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const rec = dailyMap.get(d) || { expense: 0, income: 0 };
      const mStr = String(month).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      dailyTrends.push({
        date: `${year}-${mStr}-${dStr}`,
        day: d,
        expenseAmount: rec.expense,
        incomeAmount: rec.income,
      });
    }

    // Days elapsed in the month for realistic average daily burn rate
    const now = new Date();
    const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
    const daysPassed = isCurrentMonth ? Math.min(now.getDate(), totalDaysInMonth) : totalDaysInMonth;
    const safeDaysPassed = Math.max(1, daysPassed);

    const dailyAverageExpense = Math.round(totalExpense / safeDaysPassed);
    const averageTransactionAmount = expenseCount > 0 ? Math.round(totalExpense / expenseCount) : 0;
    const projectedMonthEndExpense = dailyAverageExpense * totalDaysInMonth;

    // Largest single expense this month
    let largestTx: DemoTransaction | null = null;
    let receiptScanCount = 0;
    let receiptScanTotalAmount = 0;

    for (const tx of this.transactions) {
      if (tx.userId !== targetUser) continue;
      if (tx.date.getMonth() + 1 !== month || tx.date.getFullYear() !== year) continue;

      if (tx.type === "EXPENSE") {
        if (!largestTx || tx.amount > largestTx.amount) {
          largestTx = tx;
        }
      }

      if (tx.receiptImageUrl) {
        receiptScanCount++;
        receiptScanTotalAmount += tx.amount;
      }
    }

    let largestExpenseObj: FinancialMetrics["largestExpense"] = null;
    if (largestTx) {
      const cat = this.categories.find((c) => c.id === largestTx?.categoryId);
      largestExpenseObj = {
        merchantName: largestTx.merchantName || "Pengeluaran",
        amount: largestTx.amount,
        date: largestTx.date.toISOString(),
        categoryName: cat?.name || undefined,
      };
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRatio = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;
    const expenseToIncomeRatio = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

    const metrics: FinancialMetrics = {
      dailyAverageExpense,
      averageTransactionAmount,
      largestExpense: largestExpenseObj,
      totalTransactions: expenseCount + incomeCount,
      savingsRatio,
      expenseToIncomeRatio,
      projectedMonthEndExpense,
      receiptScanCount,
      receiptScanTotalAmount,
    };

    // Category Spending Breakdown
    const categoryBreakdown: CategorySpendingBreakdown[] = [];
    for (const [catId, val] of Array.from(categoryExpenseMap.entries())) {
      const cat = this.categories.find((c) => c.id === catId);
      const count = this.transactions.filter(
        (t) =>
          t.userId === targetUser &&
          t.categoryId === catId &&
          t.type === "EXPENSE" &&
          t.date.getMonth() + 1 === month &&
          t.date.getFullYear() === year
      ).length;

      categoryBreakdown.push({
        categoryId: catId,
        categoryName: cat?.name || "Lainnya",
        categoryIcon: cat?.icon || "tag",
        categoryColor: cat?.color || "#A855F7",
        totalAmount: val,
        percentage: totalExpense > 0 ? Number(((val / totalExpense) * 100).toFixed(1)) : 0,
        transactionCount: count,
      });
    }
    categoryBreakdown.sort((a, b) => b.totalAmount - a.totalAmount);

    // Financial Health Assessment
    let score = 70;
    if (totalIncome > 0) {
      if (savingsRatio >= 60) score = 98;
      else if (savingsRatio >= 40) score = 90;
      else if (savingsRatio >= 20) score = 82;
      else if (savingsRatio >= 5) score = 72;
      else score = 45;
    }
    if (budgetComparisons.some((b) => b.isOverBudget)) {
      score = Math.max(30, score - 15);
    }

    let status: "EXCELLENT" | "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
    let label = "Sehat & Terkendali";
    let message = "Arus kas Anda stabil dengan tingkat tabungan yang terjaga.";

    if (score >= 90) {
      status = "EXCELLENT";
      label = "Sangat Prima";
      message = `Luar biasa! Rasio tabungan Anda mencapai ${savingsRatio}%. Pertahankan disiplin finansial ini.`;
    } else if (score >= 75) {
      status = "HEALTHY";
      label = "Sehat & Stabil";
      message = `Pengeluaran bulan ini berada pada batas yang wajar (${expenseToIncomeRatio}% dari total pemasukan).`;
    } else if (score >= 50) {
      status = "WARNING";
      label = "Perlu Perhatian";
      message = "Pengeluaran mendekati atau melampaui pagu anggaran di beberapa kategori. Cermati pos belanja bulanan.";
    } else {
      status = "CRITICAL";
      label = "Defisit Pengeluaran";
      message = "Pengeluaran telah melebihi pemasukan bulan ini. Tinjau kembali pos pengeluaran prioritas.";
    }

    const financialHealth: FinancialHealth = {
      score,
      status,
      label,
      message,
    };

    const summary: MonthlySummary = {
      month,
      year,
      totalExpense,
      totalIncome,
      netSavings,
      expenseCount,
      incomeCount,
    };

    return {
      summary,
      budgetComparisons,
      dailyTrends,
      metrics,
      categoryBreakdown,
      financialHealth,
    };
  }

  private enrichTransaction(tx: DemoTransaction) {
    const wallet = this.wallets.find((w) => w.id === tx.walletId) || {
      id: tx.walletId,
      name: "Dompet",
      balance: 0,
    };
    const category = this.categories.find((c) => c.id === tx.categoryId) || null;

    return {
      ...tx,
      wallet: {
        id: wallet.id,
        name: wallet.name,
        balance: wallet.balance as any,
      },
      category: category
        ? { id: category.id, name: category.name, icon: category.icon, color: category.color }
        : null,
      amount: tx.amount as any,
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var demoStoreGlobal: DemoStoreSingleton | undefined;
}

export const demoStore =
  globalThis.demoStoreGlobal ?? new DemoStoreSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.demoStoreGlobal = demoStore;
}
