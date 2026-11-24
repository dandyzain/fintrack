import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { OverviewPage } from "@/components/dashboard/overview-page";
import { createServerQueryClient, prefetchJson } from "@/lib/api/server-prefetch";
import { queryKeys } from "@/lib/api/keys";
import { transactionSearchParams } from "@/lib/api/client";
import { currentPeriod, recentQuery, shiftPeriod } from "@/lib/period";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const qc = createServerQueryClient();
  const period = currentPeriod();
  const previous = shiftPeriod(period, -1);
  const recent = recentQuery(period);

  // Page-specific data (user/pockets/categories come from the layout).
  // Same endpoints and query keys the client uses, fetched in parallel.
  await Promise.all([
    prefetchJson(qc, queryKeys.analytics(period), `/api/analytics?month=${period.month}&year=${period.year}`),
    prefetchJson(qc, queryKeys.analytics(previous), `/api/analytics?month=${previous.month}&year=${previous.year}`),
    prefetchJson(qc, queryKeys.recent(recent), `/api/transactions?${transactionSearchParams(recent, 1)}`),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <OverviewPage />
    </HydrationBoundary>
  );
}
