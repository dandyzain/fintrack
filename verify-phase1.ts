import { ReceiptExtractionSchema, ReceiptItemSchema } from "./packages/shared/src/schemas/receipt";
import { CreateTransactionSchema } from "./packages/shared/src/schemas/transaction";

console.log("==========================================");
console.log("🧪 TESTING PHASE 1: SCHEMAS & SERVICES");
console.log("==========================================");

// 1. Test Valid Receipt Extraction Output from Vision AI
const sampleVisionOutput = {
  merchantName: "Indomaret Point Stasiun Gambir",
  date: "2026-10-09",
  totalAmount: 64500,
  tax: 5800,
  serviceCharge: 0,
  items: [
    { name: "Kopi Kenangan Mantan 250ml", price: 18000, quantity: 2 },
    { name: "Roti Sisir Mentega", price: 12500, quantity: 1 },
    { name: "Aqua Botol 600ml", price: 8000, quantity: 2 },
  ],
  suggestedCategory: "Makanan & Minuman",
};

const receiptParseResult = ReceiptExtractionSchema.safeParse(sampleVisionOutput);
if (!receiptParseResult.success) {
  console.error("❌ ReceiptExtractionSchema validation failed:", receiptParseResult.error);
  process.exit(1);
} else {
  console.log("✅ ReceiptExtractionSchema safeParse passed successfully!");
  console.log("   Merchant:", receiptParseResult.data.merchantName);
  console.log("   Total Amount:", receiptParseResult.data.totalAmount);
  console.log("   Items Count:", receiptParseResult.data.items.length);
  console.log("   Category:", receiptParseResult.data.suggestedCategory);
}

// 2. Test Edge Case: Nullable merchant and missing tax/serviceCharge defaults
const edgeCaseOutput = {
  merchantName: null,
  date: null,
  totalAmount: 25000,
  items: [],
  suggestedCategory: "Lainnya",
};

const edgeCaseResult = ReceiptExtractionSchema.safeParse(edgeCaseOutput);
if (!edgeCaseResult.success) {
  console.error("❌ Edge case parsing failed:", edgeCaseResult.error);
  process.exit(1);
} else {
  console.log("✅ Edge case with nulls and defaults passed successfully!");
  console.log("   Tax defaulted to:", edgeCaseResult.data.tax);
  console.log("   Service charge defaulted to:", edgeCaseResult.data.serviceCharge);
}

// 3. Test Invalid Receipt Data (Negative total amount)
const invalidOutput = {
  merchantName: "Toko Fiktif",
  date: "2026-10-09",
  totalAmount: -5000, // Invalid!
  items: [],
};

const invalidResult = ReceiptExtractionSchema.safeParse(invalidOutput);
if (invalidResult.success) {
  console.error("❌ Invalid data unexpectedly succeeded!");
  process.exit(1);
} else {
  console.log("✅ Invalid negative total amount correctly rejected by Zod schema!");
}

// 4. Test CreateTransactionSchema
const createTxInput = {
  walletId: "a0000000-0000-0000-0000-000000000001",
  categoryId: "c0000000-0000-0000-0000-000000000001",
  amount: 64500,
  type: "EXPENSE",
  date: "2026-10-09T08:30:00.000Z",
  merchantName: "Indomaret Point",
  notes: "Beli sarapan pagi sebelum berangkat kantor",
  receiptImageUrl: "https://xyz.supabase.co/storage/v1/object/public/receipts/user1/test.jpg",
  items: [
    { name: "Kopi Kenangan Mantan 250ml", price: 18000, quantity: 2 },
    { name: "Roti Sisir Mentega", price: 12500, quantity: 1 },
  ],
};

const createTxResult = CreateTransactionSchema.safeParse(createTxInput);
if (!createTxResult.success) {
  console.error("❌ CreateTransactionSchema validation failed:", createTxResult.error);
  process.exit(1);
} else {
  console.log("✅ CreateTransactionSchema validation passed successfully!");
}

console.log("\n🎉 ALL PHASE 1 SCHEMA VALIDATION TESTS PASSED 100%!");
