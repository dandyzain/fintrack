import { describe, expect, it } from "vitest";
import {
  CreateRecurringSchema,
  CreateTransactionSchema,
  ReceiptExtractionSchema,
  RegisterSchema,
  UpdateTransactionSchema,
} from "@fintrack/shared";

/** Shared contracts used by the API, the web app and the mobile app (replaces verify-phase1.ts). */
describe("shared schemas", () => {
  it("accepts a valid receipt extraction and rejects a non-positive total", () => {
    const ok = ReceiptExtractionSchema.safeParse({
      merchantName: "Indomaret",
      date: "2026-10-09",
      totalAmount: 64500,
      tax: 5800,
      items: [{ name: "Kopi", price: 18000, quantity: 2 }],
      suggestedCategory: "Makanan & Minuman",
    });
    expect(ok.success).toBe(true);
    expect(ReceiptExtractionSchema.safeParse({ merchantName: null, date: null, totalAmount: 0 }).success).toBe(false);
  });

  it("validates transactions, including transfers", () => {
    const base = { walletId: "w1", amount: "15000", type: "EXPENSE", date: "2026-11-01" };
    const parsed = CreateTransactionSchema.parse(base);
    expect(parsed.amount).toBe(15000); // coerced
    expect(parsed.items).toEqual([]);
    expect(CreateTransactionSchema.safeParse({ ...base, amount: -1 }).success).toBe(false);
    expect(CreateTransactionSchema.safeParse({ ...base, amount: 1e15 }).success).toBe(false);
    expect(CreateTransactionSchema.safeParse({ ...base, date: "not-a-date" }).success).toBe(false);
    expect(CreateTransactionSchema.safeParse({ ...base, type: "TRANSFER" }).success).toBe(false);
    expect(CreateTransactionSchema.safeParse({ ...base, type: "TRANSFER", toWalletId: "w1" }).success).toBe(false);
    expect(CreateTransactionSchema.safeParse({ ...base, type: "TRANSFER", toWalletId: "w2" }).success).toBe(true);
    expect(CreateTransactionSchema.safeParse({ ...base, rawOcrData: { blob: "x".repeat(70_000) } }).success).toBe(false);
  });

  it("leaves line items untouched on partial updates", () => {
    expect(UpdateTransactionSchema.parse({ id: "t1", amount: 5 }).items).toBeUndefined();
  });

  it("requires 8+ character passwords and normalises emails", () => {
    expect(RegisterSchema.safeParse({ name: "Ani", email: "a@b.co", password: "1234567" }).success).toBe(false);
    expect(RegisterSchema.parse({ name: " Ani ", email: " A@B.CO ", password: "12345678" })).toMatchObject({ name: "Ani", email: "a@b.co" });
  });

  it("validates recurring schedules", () => {
    const base = { walletId: "w1", type: "EXPENSE", amount: 1, frequency: "MONTHLY", startDate: "2026-11-01" };
    expect(CreateRecurringSchema.parse(base).interval).toBe(1);
    expect(CreateRecurringSchema.safeParse({ ...base, endDate: "2026-10-01" }).success).toBe(false);
    expect(CreateRecurringSchema.safeParse({ ...base, frequency: "HOURLY" }).success).toBe(false);
  });
});
