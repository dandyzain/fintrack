import { z } from "zod";

export const TransactionTypeEnum = z.enum(["EXPENSE", "INCOME"]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

export const CreateTransactionItemSchema = z.object({
  name: z.string().min(1, "Nama item tidak boleh kosong"),
  price: z.coerce.number().nonnegative("Harga item tidak boleh negatif").default(0),
  quantity: z.coerce.number().int().positive("Jumlah minimal 1").default(1)
});

export type CreateTransactionItemInput = z.infer<typeof CreateTransactionItemSchema>;

export const CreateTransactionSchema = z.object({
  userId: z.string().min(1, "ID Pengguna tidak valid").optional(), // Can be inferred from auth session on server
  walletId: z.string().min(1, "ID Dompet tidak valid"),
  categoryId: z.string().nullable().optional(),
  amount: z.coerce.number().positive("Jumlah transaksi harus lebih besar dari 0"),
  type: TransactionTypeEnum,
  date: z.union([z.string().min(1), z.date()]),
  merchantName: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  receiptImageUrl: z.string().trim().nullable().optional(),
  rawOcrData: z.record(z.any()).nullable().optional(),
  items: z.array(CreateTransactionItemSchema).optional().default([])
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const UpdateTransactionSchema = CreateTransactionSchema.partial().extend({
  id: z.string().min(1, "ID Transaksi tidak valid")
});

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

export const TransactionSortByEnum = z.enum([
  "date_desc",
  "date_asc",
  "amount_desc",
  "amount_asc"
]);
export type TransactionSortBy = z.infer<typeof TransactionSortByEnum>;

export const TransactionQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  walletId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  type: TransactionTypeEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  hasReceipt: z.enum(["true", "false"]).optional(),
  sortBy: TransactionSortByEnum.optional()
});

export type TransactionQueryInput = z.infer<typeof TransactionQuerySchema>;
