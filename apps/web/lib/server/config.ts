import { ConfigError } from "./errors";

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * With DATABASE_URL the app uses PostgreSQL only. Without it, everything lives
 * in server memory ("memory mode"): handy for local development and a
 * zero-setup portfolio demo, but data is lost whenever the server restarts.
 * There is never a silent switch from one to the other.
 */
export function isDatabaseMode(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function storageMode(): "database" | "memory" {
  return isDatabaseMode() ? "database" : "memory";
}

/**
 * Public base URL used in emails (password reset, verification). In production
 * it must be configured: deriving it from the Host header would let anyone
 * send reset links pointing at their own domain.
 */
export function appBaseUrl(requestUrl?: string): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (!isProduction() && requestUrl) return new URL(requestUrl).origin;
  if (!isProduction()) return "http://localhost:3000";
  throw new ConfigError("APP_URL is not set. Configure it so emails contain the correct link.");
}

export { isProduction };
