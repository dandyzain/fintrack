import { prisma, Prisma, TransactionType } from "@fintrack/database";
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryInput,
  MonthlySummary,
  CategoryBudgetComparison,
  DailyExpenseTrend,
  DashboardAnalyticsResponse,
} from "@fintrack/shared";
import { demoStore } from "../demo-store";

export interface TransactionWithRelations {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string | null;
  amount: Prisma.Decimal;
  type: TransactionType;
  date: Date;
  merchantName: string | null;
  notes: string | null;
  receiptImageUrl: string | null;
  rawOcrData: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  wallet: {
    id: string;
    name: string;
    balance: Prisma.Decimal;
  };
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  items: Array<{
    id: string;
    transactionId: string;
    name: string;
    price: Prisma.Decimal;
    quantity: number;
  }>;
}

export interface PaginatedTransactions {
  items: TransactionWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class TransactionService {
  /**
   * Create a new transaction and update wallet balance atomically
   */
  public static async createTransaction(
    input: CreateTransactionInput & { userId: string }
  ): Promise<TransactionWithRelations> {
    if (!process.env.DATABASE_URL) {
      return demoStore.createTransaction(input) as unknown as TransactionWithRelations;
    }

    const {
      userId,
      walletId,
      categoryId,
      amount,
      type,
      date,
      merchantName,
      notes,
      receiptImageUrl,
      rawOcrData,
      items,
    } = input;

    const decimalAmount = new Prisma.Decimal(amount);

    try {
      return await prisma.$transaction(async (tx) => {
      // 1. Validate wallet existence and ownership
      const wallet = await tx.wallet.findFirst({
        where: { id: walletId, userId },
      });

      if (!wallet) {
        throw new Error("Dompet (Wallet) tidak ditemukan atau tidak memiliki akses.");
      }

      // 2. Validate category if provided
      if (categoryId) {
        const category = await tx.category.findFirst({
          where: {
            id: categoryId,
            OR: [{ userId }, { userId: null }],
          },
        });
        if (!category) {
          throw new Error("Kategori tidak valid atau tidak ditemukan.");
        }
      }

      // 3. Calculate new balance
      const currentBalance = new Prisma.Decimal(wallet.balance);
      let nextBalance: Prisma.Decimal;

      if (type === "EXPENSE") {
        nextBalance = currentBalance.minus(decimalAmount);
      } else {
        nextBalance = currentBalance.plus(decimalAmount);
      }

      // 4. Update wallet balance
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: nextBalance },
      });

      // 5. Create transaction and nested transaction items
      const transactionDate = new Date(date);

      const createdTransaction = await tx.transaction.create({
        data: {
          userId,
          walletId,
          categoryId: categoryId || null,
          amount: decimalAmount,
          type: type as TransactionType,
          date: transactionDate,
          merchantName: merchantName || null,
          notes: notes || null,
          receiptImageUrl: receiptImageUrl || null,
          rawOcrData: (rawOcrData as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          items: items && items.length > 0
            ? {
                create: items.map((item) => ({
                  name: item.name,
                  price: new Prisma.Decimal(item.price),
                  quantity: item.quantity,
                })),
              }
            : undefined,
        },
        include: {
          wallet: {
            select: { id: true, name: true, balance: true },
          },
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
          items: true,
        },
      });

      return createdTransaction as TransactionWithRelations;
    });
    } catch (dbErr) {
      console.warn("Prisma error in createTransaction. Menggunakan DemoStore lokal:", (dbErr as Error).message);
      return demoStore.createTransaction(input) as unknown as TransactionWithRelations;
    }
  }

  /**
   * Update an existing transaction with atomic wallet balance adjustments
   */
  public static async updateTransaction(
    input: UpdateTransactionInput & { userId: string }
  ): Promise<TransactionWithRelations> {
    if (!process.env.DATABASE_URL) {
      return demoStore.updateTransaction(input) as unknown as TransactionWithRelations;
    }

    const { id, userId, ...updates } = input;

    try {
      return await prisma.$transaction(async (tx) => {
      // 1. Fetch current transaction record with relations
      const existing = await tx.transaction.findFirst({
        where: { id, userId },
        include: { wallet: true, items: true },
      });

      if (!existing) {
        throw new Error("Transaksi tidak ditemukan atau Anda tidak memiliki akses.");
      }

      const targetWalletId = updates.walletId || existing.walletId;
      const targetAmount =
        updates.amount !== undefined
          ? new Prisma.Decimal(updates.amount)
          : new Prisma.Decimal(existing.amount);
      const targetType = (updates.type as TransactionType) || existing.type;

      // 2. Handle Wallet mutations
      if (targetWalletId === existing.walletId) {
        // Same wallet mutation:
        // Step A: Revert old transaction impact
        // If old was EXPENSE -> add back to balance
        // If old was INCOME -> subtract from balance
        let balanceModifier =
          existing.type === "EXPENSE"
            ? new Prisma.Decimal(existing.amount)
            : new Prisma.Decimal(existing.amount).negated();

        // Step B: Apply new transaction impact
        // If new is EXPENSE -> subtract from balance
        // If new is INCOME -> add to balance
        if (targetType === "EXPENSE") {
          balanceModifier = balanceModifier.minus(targetAmount);
        } else {
          balanceModifier = balanceModifier.plus(targetAmount);
        }

        const updatedWalletBalance = new Prisma.Decimal(existing.wallet.balance).plus(balanceModifier);

        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: updatedWalletBalance },
        });
      } else {
        // Changed wallet:
        // 1. Revert from old wallet
        const oldWalletRevert =
          existing.type === "EXPENSE"
            ? new Prisma.Decimal(existing.wallet.balance).plus(existing.amount)
            : new Prisma.Decimal(existing.wallet.balance).minus(existing.amount);

        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: oldWalletRevert },
        });

        // 2. Apply to new target wallet
        const targetWallet = await tx.wallet.findFirst({
          where: { id: targetWalletId, userId },
        });

        if (!targetWallet) {
          throw new Error("Dompet tujuan baru tidak ditemukan.");
        }

        const targetWalletNewBalance =
          targetType === "EXPENSE"
            ? new Prisma.Decimal(targetWallet.balance).minus(targetAmount)
            : new Prisma.Decimal(targetWallet.balance).plus(targetAmount);

        await tx.wallet.update({
          where: { id: targetWalletId },
          data: { balance: targetWalletNewBalance },
        });
      }

      // 3. Update Transaction Items if provided
      if (updates.items !== undefined) {
        await tx.transactionItem.deleteMany({
          where: { transactionId: existing.id },
        });

        if (updates.items.length > 0) {
          await tx.transactionItem.createMany({
            data: updates.items.map((item) => ({
              transactionId: existing.id,
              name: item.name,
              price: new Prisma.Decimal(item.price),
              quantity: item.quantity,
            })),
          });
        }
      }

      // 4. Update Transaction Record
      const updatedTx = await tx.transaction.update({
        where: { id: existing.id },
        data: {
          walletId: targetWalletId,
          categoryId: updates.categoryId !== undefined ? updates.categoryId : existing.categoryId,
          amount: targetAmount,
          type: targetType,
          date: updates.date ? new Date(updates.date) : existing.date,
          merchantName: updates.merchantName !== undefined ? updates.merchantName : existing.merchantName,
          notes: updates.notes !== undefined ? updates.notes : existing.notes,
          receiptImageUrl: updates.receiptImageUrl !== undefined ? updates.receiptImageUrl : existing.receiptImageUrl,
          rawOcrData:
            updates.rawOcrData !== undefined
              ? ((updates.rawOcrData as Prisma.InputJsonValue) ?? Prisma.JsonNull)
              : existing.rawOcrData ?? Prisma.JsonNull,
        },
        include: {
          wallet: { select: { id: true, name: true, balance: true } },
          category: { select: { id: true, name: true, icon: true, color: true } },
          items: true,
        },
      });

      return updatedTx as TransactionWithRelations;
    });
    } catch (err) {
      console.warn("Prisma error in updateTransaction. Menggunakan DemoStore lokal:", (err as Error).message);
      return demoStore.updateTransaction(input) as unknown as TransactionWithRelations;
    }
  }

  /**
   * Delete transaction and safely revert wallet balance atomically
   */
  public static async deleteTransaction(
    id: string,
    userId: string
  ): Promise<{ success: boolean; deletedId: string }> {
    if (!process.env.DATABASE_URL) {
      return demoStore.deleteTransaction(id);
    }

    try {
      return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, userId },
        include: { wallet: true },
      });

      if (!transaction) {
        throw new Error("Transaksi tidak ditemukan atau Anda tidak memiliki akses.");
      }

      // Revert wallet mutation:
      // If deleted was EXPENSE -> balance should increase back (+ amount)
      // If deleted was INCOME -> balance should decrease (- amount)
      const revertedBalance =
        transaction.type === "EXPENSE"
          ? new Prisma.Decimal(transaction.wallet.balance).plus(transaction.amount)
          : new Prisma.Decimal(transaction.wallet.balance).minus(transaction.amount);

      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: revertedBalance },
      });

      // Delete transaction (cascades to transaction items automatically per Prisma schema)
      await tx.transaction.delete({
        where: { id: transaction.id },
      });

      return { success: true, deletedId: id };
    });
    } catch (err) {
      console.warn("Prisma error in deleteTransaction. Menggunakan DemoStore lokal:", (err as Error).message);
      return demoStore.deleteTransaction(id);
    }
  }

  /**
   * Retrieve single transaction by ID with verification of user ownership
   */
  public static async getTransactionById(
    id: string,
    userId: string
  ): Promise<TransactionWithRelations | null> {
    if (!process.env.DATABASE_URL) {
      return demoStore.getTransactionById(id) as unknown as TransactionWithRelations | null;
    }

    try {
      const transaction = await prisma.transaction.findFirst({
        where: { id, userId },
        include: {
          wallet: { select: { id: true, name: true, balance: true } },
          category: { select: { id: true, name: true, icon: true, color: true } },
          items: true,
        },
      });

      return transaction as TransactionWithRelations | null;
    } catch (err) {
      return demoStore.getTransactionById(id) as unknown as TransactionWithRelations | null;
    }
  }

  /**
   * Query transactions with filter, search, and pagination
   */
  public static async getTransactions(
    query: TransactionQueryInput & { userId: string }
  ): Promise<PaginatedTransactions> {
    if (!process.env.DATABASE_URL) {
      return demoStore.getTransactions(query) as unknown as PaginatedTransactions;
    }

    try {
      const { userId, walletId, categoryId, type, startDate, endDate, search, page, limit, hasReceipt, sortBy } = query;

      const skip = (page - 1) * limit;
      const where: Prisma.TransactionWhereInput = {
        userId,
        ...(walletId ? { walletId } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(type ? { type: type as TransactionType } : {}),
        ...(hasReceipt === "true"
          ? { receiptImageUrl: { not: null } }
          : hasReceipt === "false"
          ? { receiptImageUrl: null }
          : {}),
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { merchantName: { contains: search } },
                { notes: { contains: search } },
              ],
            }
          : {}),
      };

      let orderBy: Prisma.TransactionOrderByWithRelationInput = { date: "desc" };
      if (sortBy === "date_asc") orderBy = { date: "asc" };
      else if (sortBy === "amount_desc") orderBy = { amount: "desc" };
      else if (sortBy === "amount_asc") orderBy = { amount: "asc" };

      const [total, items] = await Promise.all([
        prisma.transaction.count({ where }),
        prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            wallet: { select: { id: true, name: true, balance: true } },
            category: { select: { id: true, name: true, icon: true, color: true } },
            items: true,
          },
        }),
      ]);

      return {
        items: items as TransactionWithRelations[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (err) {
      return demoStore.getTransactions(query) as unknown as PaginatedTransactions;
    }
  }

  /**
   * Dashboard Analytics Aggregation:
   * 1. Total expense vs income for the current month
   * 2. Category budget comparison (actual vs limit, percentage, remaining)
   * 3. Daily expense trend throughout the month formatted for Recharts
   */
  public static async getMonthlyAnalytics(
    userId: string,
    month: number,
    year: number
  ): Promise<DashboardAnalyticsResponse> {
    if (!process.env.DATABASE_URL) {
      return demoStore.getMonthlyAnalytics(month, year, userId);
    }

    try {
      // Determine start and end date for the target month (UTC normalized)
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    // Last day of month
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    // Query transactions and budgets concurrently
    const [transactions, budgets, allCategories] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
        },
      }),
      prisma.budget.findMany({
        where: {
          userId,
          month,
          year,
        },
        include: {
          category: true,
        },
      }),
      prisma.category.findMany({
        where: {
          OR: [{ userId }, { userId: null }],
        },
      }),
    ]);

    // 1. Calculate Monthly Summary
    let totalExpense = 0;
    let totalIncome = 0;
    let expenseCount = 0;
    let incomeCount = 0;

    // Map to aggregate expense per category
    const categoryExpenseMap = new Map<string, number>();

    // Map to aggregate daily expenses and incomes (day 1..N)
    const dailyMap = new Map<number, { expense: number; income: number }>();
    for (let day = 1; day <= totalDaysInMonth; day++) {
      dailyMap.set(day, { expense: 0, income: 0 });
    }

    for (const tx of transactions) {
      const amountNum = Number(tx.amount);
      const txDay = new Date(tx.date).getUTCDate();

      if (tx.type === "EXPENSE") {
        totalExpense += amountNum;
        expenseCount += 1;

        if (tx.categoryId) {
          const currentCategorySum = categoryExpenseMap.get(tx.categoryId) || 0;
          categoryExpenseMap.set(tx.categoryId, currentCategorySum + amountNum);
        }

        const dayRecord = dailyMap.get(txDay);
        if (dayRecord) {
          dayRecord.expense += amountNum;
        }
      } else if (tx.type === "INCOME") {
        totalIncome += amountNum;
        incomeCount += 1;

        const dayRecord = dailyMap.get(txDay);
        if (dayRecord) {
          dayRecord.income += amountNum;
        }
      }
    }

    const netSavings = totalIncome - totalExpense;

    const summary: MonthlySummary = {
      month,
      year,
      totalExpense,
      totalIncome,
      netSavings,
      expenseCount,
      incomeCount,
    };

    // 2. Calculate Category Budget Comparisons
    const budgetComparisons: CategoryBudgetComparison[] = [];
    const processedCategoryIds = new Set<string>();

    for (const budget of budgets) {
      const actualExpense = categoryExpenseMap.get(budget.categoryId) || 0;
      const limitAmount = Number(budget.limitAmount);
      const remainingBudget = Math.max(0, limitAmount - actualExpense);
      const percentageUsed = limitAmount > 0 ? (actualExpense / limitAmount) * 100 : 0;
      const isOverBudget = actualExpense > limitAmount;

      budgetComparisons.push({
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        categoryIcon: budget.category.icon,
        categoryColor: budget.category.color,
        limitAmount,
        actualExpense,
        remainingBudget,
        percentageUsed: Number(percentageUsed.toFixed(1)),
        isOverBudget,
      });

      processedCategoryIds.add(budget.categoryId);
    }

    // Add categories that have expenses this month but no explicit budget set
    for (const [catId, expenseVal] of Array.from(categoryExpenseMap.entries())) {
      if (!processedCategoryIds.has(catId)) {
        const catObj = allCategories.find((c) => c.id === catId);
        if (catObj) {
          budgetComparisons.push({
            categoryId: catObj.id,
            categoryName: catObj.name,
            categoryIcon: catObj.icon,
            categoryColor: catObj.color,
            limitAmount: 0,
            actualExpense: expenseVal,
            remainingBudget: 0,
            percentageUsed: 100,
            isOverBudget: true, // No budget set, any expense is technically unbudgeted
          });
        }
      }
    }

    // Sort comparisons by highest expense first
    budgetComparisons.sort((a, b) => b.actualExpense - a.actualExpense);

    // 3. Format Daily Trends for Recharts
    const dailyTrends: DailyExpenseTrend[] = [];
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const rec = dailyMap.get(day) || { expense: 0, income: 0 };
      const formattedMonth = String(month).padStart(2, "0");
      const formattedDay = String(day).padStart(2, "0");
      const isoDate = `${year}-${formattedMonth}-${formattedDay}`;

      dailyTrends.push({
        date: isoDate,
        day,
        expenseAmount: rec.expense,
        incomeAmount: rec.income,
      });
    }

      return {
        summary,
        budgetComparisons,
        dailyTrends,
      };
    } catch (err) {
      return demoStore.getMonthlyAnalytics(month, year, userId);
    }
  }
}
