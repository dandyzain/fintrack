import { NextResponse } from "next/server";
import { TransactionQuerySchema } from "@fintrack/shared";
import { withUser } from "@/lib/server/auth";
import { parse, searchParams } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { toFilter } from "@/lib/server/services/transactions";
import { csvCell } from "@/lib/csv";
import { localizeCategoryName, localizeWalletName, type Language } from "@/lib/i18n/translations";

export const dynamic = "force-dynamic";

const PAGE = 500;

/** Every transaction matching the ledger filters, as CSV (no row cap). */
export const GET = withUser(async (request, { user }) => {
  const params = searchParams(request);
  const lang: Language = params.lang === "id" ? "id" : "en";
  const query = parse(TransactionQuerySchema, { ...params, page: 1, limit: 100 });
  const filter = toFilter(query, user.id);
  const store = getStore();

  const header =
    lang === "id"
      ? ["Tanggal", "Jenis", "Merchant", "Kategori", "Kantong", "Kantong tujuan", "Jumlah (IDR)", "Catatan", "Struk"]
      : ["Date", "Type", "Merchant", "Category", "Pocket", "To pocket", "Amount (IDR)", "Notes", "Receipt"];
  const lines = [header.map(csvCell).join(",")];

  for (let skip = 0; ; skip += PAGE) {
    const { items } = await store.listTransactions(filter, { skip, take: PAGE });
    for (const t of items) {
      const signed = t.type === "EXPENSE" ? -t.amount : t.amount;
      lines.push(
        [
          t.date.toISOString().slice(0, 10),
          t.type,
          t.merchantName ?? "",
          t.category ? localizeCategoryName(t.category.name, lang) : "",
          localizeWalletName(t.wallet.name, lang),
          t.toWallet ? localizeWalletName(t.toWallet.name, lang) : "",
          signed,
          t.notes ?? "",
          t.receiptImageUrl ? "yes" : "",
        ]
          .map(csvCell)
          .join(",")
      );
    }
    if (items.length < PAGE) break;
  }

  const date = new Date().toISOString().slice(0, 10);
  // BOM so spreadsheet apps open UTF-8 (e.g. "Rp", accents) correctly.
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fintrack-transactions-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
