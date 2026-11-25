import { z } from "zod";

export const TransactionTypeEnum = z.enum(["EXPENSE", "INCOME", "TRANSFER"]);
export type TransactionType = z.infer<typeof TransactionTypeEnum>;

/** Largest single amount accepted (fits comfortably in DECIMAL(18,2)). */
export const MAX_AMOUNT = 999_999_999_999.99;

/** rawOcrData is stored as JSON; keep it bounded so a client can't bloat rows. */
const MAX_RAW_OCR_BYTES = 64 * 1024;

const amountSchema = z.coerce
  .number({ invalid_type_error: "Jumlah transaksi harus berupa angka" })
  .finite("Jumlah transaksi tidak valid")
  .positive("Jumlah transaksi harus lebih besar dari 0")
  .max(MAX_AMOUNT, "Jumlah transaksi terlalu besar");

export const dateInputSchema = z
  .union([z.string().min(1), z.date()])
  .refine((v) => {
    const d = v instanceof Date ? v : new Date(v);
    const y = d.getUTCFullYear();
    return !Number.isNaN(d.getTime()) && y >= 2000 && y <= 2100;
  }, "Tanggal transaksi tidak valid");

export const CreateTransactionItemSchema = z.object({
  name: z.string().trim().min(1, "Nama item tidak boleh kosong").max(200),
  price: z.coerce.number().finite().nonnegative("Harga item tidak boleh negatif").max(MAX_AMOUNT).default(0),
  quantity: z.coerce.number().int().positive("Jumlah minimal 1").max(100_000).default(1),
});

export type CreateTransactionItemInput = z.infer<typeof CreateTransactionItemSchema>;

const rawOcrSchema = z
  .record(z.any())
  .nullable()
  .optional()
  .refine((v) => v == null || JSON.stringify(v).length <= MAX_RAW_OCR_BYTES, "Data OCR terlalu besar");

/** Field shapes shared by create and update (update makes every field optional). */
export const TransactionFieldsSchema = z.object({
  /** Ignored by the server: the owner always comes from the session. */
  userId: z.string().optional(),
  walletId: z.string().min(1, "ID Dompet tidak valid"),
  /** Destination pocket. Required for TRANSFER, ignored otherwise. */
  toWalletId: z.string().min(1).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  amount: amountSchema,
  type: TransactionTypeEnum,
  date: dateInputSchema,
  merchantName: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  receiptImageUrl: z.string().trim().max(2048).nullable().optional(),
  rawOcrData: rawOcrSchema,
  items: z.array(CreateTransactionItemSchema).max(200).optional().default([]),
});

export const CreateTransactionSchema = TransactionFieldsSchema.superRefine((v, ctx) => {
  if (v.type === "TRANSFER") {
    if (!v.toWalletId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toWalletId"], message: "Pilih kantong tujuan transfer" });
    } else if (v.toWalletId === v.walletId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toWalletId"], message: "Kantong asal dan tujuan harus berbeda" });
    }
  }
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const UpdateTransactionSchema = TransactionFieldsSchema.partial().extend({
  id: z.string().min(1, "ID Transaksi tidak valid"),
});

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

export const TransactionSortByEnum = z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]);
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
  search: z.string().trim().max(100).optional(),
  hasReceipt: z.enum(["true", "false"]).optional(),
  sortBy: TransactionSortByEnum.optional(),
});

export type TransactionQueryInput = z.infer<typeof TransactionQuerySchema>;
