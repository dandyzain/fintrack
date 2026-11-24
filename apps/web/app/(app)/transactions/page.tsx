import { Suspense } from "react";
import type { Metadata } from "next";
import { TransactionsPage } from "@/components/transactions/transactions-page";
import { PageSkeleton } from "@/components/layout/app-shell";

export const metadata: Metadata = { title: "Transactions" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TransactionsPage />
    </Suspense>
  );
}
