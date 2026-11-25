import type { Metadata } from "next";
import { TransactionsPage } from "@/components/transactions/transactions-page";

export const metadata: Metadata = { title: "Transactions" };

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Search params are read on the server so the page renders without a client-only bailout. */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <TransactionsPage
      initialWalletId={first(searchParams.walletId)}
      initialCategoryId={first(searchParams.categoryId)}
      focusSearch={first(searchParams.focus) === "search"}
    />
  );
}
