import { z } from "zod";
import { MAX_AMOUNT, TransactionTypeEnum, dateInputSchema } from "./transaction";

const nameSchema = (label: string) =>
  z.string().trim().min(1, `Nama ${label} wajib diisi.`).max(50, `Nama ${label} maksimal 50 karakter.`);

const balanceSchema = z.coerce
  .number({ invalid_type_error: "Saldo harus berupa angka" })
  .finite("Saldo tidak valid")
  .min(-MAX_AMOUNT, "Saldo terlalu kecil")
  .max(MAX_AMOUNT, "Saldo terlalu besar");

/* ---------- Pockets (wallets) ---------- */

export const CreateWalletSchema = z.object({
  name: nameSchema("kantong"),
  balance: balanceSchema.optional().default(0),
});

export const UpdateWalletSchema = z
  .object({
    name: nameSchema("kantong").optional(),
    /** Sets the balance directly (manual correction to match the bank/app). */
    balance: balanceSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.balance !== undefined, "Tidak ada perubahan yang dikirim.");

export const DeleteWalletModeEnum = z.enum(["move", "delete-all"]);

/* ---------- Categories ---------- */

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna harus berupa kode hex, mis. #F97316");

export const CreateCategorySchema = z.object({
  name: nameSchema("kategori"),
  icon: z.string().trim().min(1).max(40).default("Tag"),
  color: hexColorSchema.default("#6B7280"),
});

export const UpdateCategorySchema = CreateCategorySchema.partial().refine(
  (v) => v.name !== undefined || v.icon !== undefined || v.color !== undefined,
  "Tidak ada perubahan yang dikirim."
);

/* ---------- Budgets ---------- */

const monthSchema = z.coerce.number().int().min(1, "Bulan tidak valid").max(12, "Bulan tidak valid");
const yearSchema = z.coerce.number().int().min(2000, "Tahun tidak valid").max(2100, "Tahun tidak valid");

export const PeriodQuerySchema = z.object({ month: monthSchema, year: yearSchema });

export const UpsertBudgetSchema = z.object({
  categoryId: z.string().min(1, "Kategori wajib dipilih."),
  month: monthSchema,
  year: yearSchema,
  limitAmount: z.coerce
    .number()
    .finite()
    .positive("Batas anggaran harus lebih besar dari 0")
    .max(MAX_AMOUNT, "Batas anggaran terlalu besar"),
});

export const CopyBudgetsSchema = z.object({
  from: PeriodQuerySchema,
  to: PeriodQuerySchema,
});

/* ---------- Recurring transactions ---------- */

export const RecurrenceFrequencyEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencyEnum>;

const recurringFields = z.object({
  walletId: z.string().min(1, "Kantong wajib dipilih."),
  toWalletId: z.string().min(1).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  type: TransactionTypeEnum,
  amount: z.coerce.number().finite().positive("Jumlah harus lebih besar dari 0").max(MAX_AMOUNT),
  merchantName: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  frequency: RecurrenceFrequencyEnum,
  interval: z.coerce.number().int().min(1, "Interval minimal 1").max(365).default(1),
  startDate: dateInputSchema,
  endDate: dateInputSchema.nullable().optional(),
});

export const CreateRecurringSchema = recurringFields.superRefine((v, ctx) => {
  if (v.type === "TRANSFER" && (!v.toWalletId || v.toWalletId === v.walletId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toWalletId"], message: "Pilih kantong tujuan yang berbeda" });
  }
  if (v.endDate && new Date(v.endDate) < new Date(v.startDate)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "Tanggal selesai harus setelah tanggal mulai" });
  }
});

export const UpdateRecurringSchema = z
  .object({
    active: z.boolean().optional(),
    amount: recurringFields.shape.amount.optional(),
    merchantName: recurringFields.shape.merchantName,
    notes: recurringFields.shape.notes,
    categoryId: recurringFields.shape.categoryId,
    endDate: recurringFields.shape.endDate,
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Tidak ada perubahan yang dikirim.");

export type CreateWalletInput = z.infer<typeof CreateWalletSchema>;
export type UpdateWalletInput = z.infer<typeof UpdateWalletSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type UpsertBudgetInput = z.infer<typeof UpsertBudgetSchema>;
export type CreateRecurringInput = z.infer<typeof CreateRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof UpdateRecurringSchema>;
