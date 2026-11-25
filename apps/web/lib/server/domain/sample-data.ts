import type { SampleData } from "../store/types";
import { startOfDayUTC } from "./recurrence";

/**
 * Realistic sample data for a demo sandbox, generated relative to `now` so
 * the dashboard always has this month, last month and the month before.
 * Wallet balances here are opening balances; the importer adds the effect of
 * every transaction, so the sandbox starts consistent.
 */
export function buildSampleData(now: Date = new Date()): SampleData {
  const today = startOfDayUTC(now);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth(); // 0-based

  /** Day `d` of the month `offset` months from now (clamped to month length). */
  const dateAt = (offset: number, d: number) => {
    const total = y * 12 + m + offset;
    const year = Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12;
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(d, last)));
  };
  const period = (offset: number) => {
    const total = y * 12 + m + offset;
    return { month: (((total % 12) + 12) % 12) + 1, year: Math.floor(total / 12) };
  };

  type T = SampleData["transactions"][number];
  const transactions: T[] = [];
  const add = (offset: number, d: number, p: Partial<T> & Pick<T, "type" | "amount" | "walletKey">) => {
    const date = dateAt(offset, d);
    if (date > today) return; // never create future-dated samples
    transactions.push({ merchantName: null, notes: null, receiptImageUrl: null, rawOcrData: null, items: [], date, ...p });
  };

  for (const offset of [-2, -1, 0]) {
    const s = offset === -2 ? 0.92 : offset === -1 ? 1.08 : 1;
    add(offset, 1, { type: "INCOME", amount: 9_500_000, walletKey: "bank", categoryName: "Gaji & Pendapatan", merchantName: "PT Nusantara Digital", notes: "Gaji Pokok Bulanan" });
    add(offset, 2, { type: "TRANSFER", amount: 1_000_000, walletKey: "bank", toWalletKey: "ewallet", notes: "Isi saldo e-wallet" });
    add(offset, 3, { type: "EXPENSE", amount: Math.round(1_850_000 * s), walletKey: "bank", categoryName: "Tagihan & Utilitas", merchantName: "Kos Melati", notes: "Sewa kamar" });
    add(offset, 5, {
      type: "EXPENSE",
      amount: 302_000,
      walletKey: "bank",
      categoryName: "Belanja Bulanan",
      merchantName: "Superindo",
      notes: "Belanja kebutuhan pokok mingguan",
      items: [
        { name: "Beras Premium 5kg", price: 74_000, quantity: 1 },
        { name: "Daging Ayam 1kg", price: 42_000, quantity: 2 },
        { name: "Minyak Goreng 2L", price: 36_000, quantity: 2 },
        { name: "Telur Ayam 1kg", price: 36_000, quantity: 2 },
      ],
    });
    add(offset, 6, { type: "EXPENSE", amount: Math.round(58_000 * s), walletKey: "cash", categoryName: "Makanan & Minuman", merchantName: "Kopi Kenangan", notes: "Kopi sore & meeting client" });
    add(offset, 8, { type: "EXPENSE", amount: 45_000, walletKey: "ewallet", categoryName: "Transportasi", merchantName: "Gojek", notes: "Ongkos ke kantor" });
    add(offset, 10, { type: "EXPENSE", amount: Math.round(186_000 * s), walletKey: "ewallet", categoryName: "Makanan & Minuman", merchantName: "Warung Padang Sederhana", notes: "Makan siang bersama tim" });
    add(offset, 12, { type: "EXPENSE", amount: 54_990, walletKey: "bank", categoryName: "Hiburan", merchantName: "Netflix" });
    add(offset, 15, { type: "EXPENSE", amount: Math.round(350_000 * s), walletKey: "bank", categoryName: "Tagihan & Utilitas", merchantName: "PLN", notes: "Token listrik" });
    add(offset, 18, { type: "EXPENSE", amount: Math.round(275_000 * s), walletKey: "ewallet", categoryName: "Transportasi", merchantName: "Pertamina", notes: "Bensin" });
    add(offset, 20, { type: "EXPENSE", amount: Math.round(420_000 * s), walletKey: "bank", categoryName: "Belanja Bulanan", merchantName: "Indomaret" });
    add(offset, 23, { type: "EXPENSE", amount: Math.round(130_000 * s), walletKey: "cash", categoryName: "Kesehatan", merchantName: "Apotek K-24" });
    add(offset, 26, { type: "EXPENSE", amount: Math.round(240_000 * s), walletKey: "ewallet", categoryName: "Hiburan", merchantName: "CGV Cinemas" });
  }
  add(-1, 21, { type: "INCOME", amount: 1_500_000, walletKey: "bank", categoryName: "Gaji & Pendapatan", merchantName: "Klien Freelance", notes: "Bonus Proyek" });

  const budgets: SampleData["budgets"] = [];
  for (const offset of [-1, 0]) {
    const p = period(offset);
    budgets.push(
      { categoryName: "Makanan & Minuman", limitAmount: 1_200_000, ...p },
      { categoryName: "Belanja Bulanan", limitAmount: 1_500_000, ...p },
      { categoryName: "Transportasi", limitAmount: 400_000, ...p },
      { categoryName: "Hiburan", limitAmount: 250_000, ...p }
    );
  }

  /** Monthly rule anchored two months ago; occurrences up to today are already in `transactions`. */
  const monthly = (d: number) => {
    const doneThisMonth = dateAt(0, d) <= today;
    return {
      startDate: dateAt(-2, d),
      occurrences: doneThisMonth ? 3 : 2,
      nextRunAt: doneThisMonth ? dateAt(1, d) : dateAt(0, d),
    };
  };

  return {
    wallets: [
      { key: "bank", name: "BCA Tabungan", balance: 6_500_000 },
      { key: "cash", name: "Dompet Tunai", balance: 650_000 },
      { key: "ewallet", name: "GoPay / OVO", balance: 250_000 },
    ],
    budgets,
    transactions,
    recurring: [
      {
        walletKey: "bank",
        categoryName: "Gaji & Pendapatan",
        type: "INCOME",
        amount: 9_500_000,
        merchantName: "PT Nusantara Digital",
        notes: "Gaji Pokok Bulanan",
        frequency: "MONTHLY",
        interval: 1,
        endDate: null,
        ...monthly(1),
      },
      {
        walletKey: "bank",
        categoryName: "Hiburan",
        type: "EXPENSE",
        amount: 54_990,
        merchantName: "Netflix",
        notes: null,
        frequency: "MONTHLY",
        interval: 1,
        endDate: null,
        ...monthly(12),
      },
    ],
  };
}
