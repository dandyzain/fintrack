import { z } from "zod";

export const ReceiptCategoryEnum = z.enum([
  "Makanan & Minuman",
  "Belanja Bulanan",
  "Transportasi",
  "Kesehatan",
  "Hiburan",
  "Lainnya"
]);

export type ReceiptCategory = z.infer<typeof ReceiptCategoryEnum>;

export const ReceiptItemSchema = z.object({
  name: z.string().min(1, "Nama item tidak boleh kosong"),
  price: z.number().positive("Harga item harus lebih besar dari 0"),
  quantity: z.number().int().positive("Jumlah item minimal 1").default(1)
});

export type ReceiptItem = z.infer<typeof ReceiptItemSchema>;

export const ReceiptExtractionSchema = z.object({
  merchantName: z.string().nullable(),
  date: z
    .string()
    .describe("ISO date format YYYY-MM-DD atau null jika tidak terbaca")
    .nullable(),
  totalAmount: z.number().positive("Total transaksi harus bernilai positif"),
  tax: z.number().nonnegative("Pajak tidak boleh bernilai negatif").optional().default(0),
  serviceCharge: z.number().nonnegative("Service charge tidak boleh bernilai negatif").optional().default(0),
  items: z.array(ReceiptItemSchema).default([]),
  suggestedCategory: ReceiptCategoryEnum.default("Lainnya")
});

export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;

/**
 * Schema for review/confirming scanned receipt data before saving
 */
export const ReceiptReviewSchema = ReceiptExtractionSchema.extend({
  walletId: z.string().min(1, "Dompet yang dipilih tidak valid"),
  categoryId: z.string().min(1, "Kategori yang dipilih tidak valid").nullable().optional(),
  receiptImageUrl: z.string().url("URL gambar struk tidak valid").nullable().optional(),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").nullable().optional()
});

export type ReceiptReview = z.infer<typeof ReceiptReviewSchema>;
