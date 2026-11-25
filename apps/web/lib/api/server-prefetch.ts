import { cookies, headers } from "next/headers";
import { QueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Server-side prefetch that calls the app's *own* Route Handlers with the
 * viewer's session cookie — so there is exactly one implementation of every
 * business rule (the API), and the first HTML already contains real data.
 * Any failure is swallowed: the client simply fetches as before.
 */
async function serverGet<T>(path: string): Promise<T | undefined> {
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return undefined;
    const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
    const res = await fetch(`${proto}://${host}${path}`, {
      headers: { cookie: cookies().toString(), accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { success?: boolean; data?: T };
    return json.success ? json.data : undefined;
  } catch {
    return undefined;
  }
}

export function createServerQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
}

export async function prefetchJson<T, R = T>(
  qc: QueryClient,
  key: QueryKey,
  path: string,
  select?: (data: T) => R
) {
  const data = await serverGet<T>(path);
  if (data !== undefined) qc.setQueryData(key, select ? select(data) : data);
}
