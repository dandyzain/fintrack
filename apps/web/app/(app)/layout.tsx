import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { AuthUser } from "@fintrack/shared";
import { AppShell } from "@/components/layout/app-shell";
import { createServerQueryClient, prefetchJson } from "@/lib/api/server-prefetch";
import { queryKeys } from "@/lib/api/keys";

export const dynamic = "force-dynamic";

/**
 * Data every app page needs (user, pockets, categories) is prefetched once per
 * full page load from the existing API routes, so the shell and first paint
 * already show real content. Client navigation keeps this layout mounted.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const qc = createServerQueryClient();
  await Promise.all([
    prefetchJson<{ user: AuthUser }, AuthUser>(qc, queryKeys.me, "/api/auth/me", (d) => d.user),
    prefetchJson(qc, queryKeys.wallets, "/api/wallets"),
    prefetchJson(qc, queryKeys.categories, "/api/categories"),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <AppShell>{children}</AppShell>
    </HydrationBoundary>
  );
}
