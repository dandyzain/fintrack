import crypto from "crypto";
import { tooManyRequests } from "./errors";
import { getStore } from "./store";

/**
 * Fixed-window limits. Counters live in the database (shared by every
 * serverless instance) or in memory in memory mode. Identifiers such as email
 * addresses are hashed before they are stored.
 */
export const LIMITS = {
  loginIp: { limit: 30, windowSeconds: 15 * 60 },
  loginEmail: { limit: 8, windowSeconds: 15 * 60 },
  register: { limit: 10, windowSeconds: 60 * 60 },
  forgotEmail: { limit: 3, windowSeconds: 60 * 60 },
  forgotIp: { limit: 10, windowSeconds: 60 * 60 },
  verifyResend: { limit: 5, windowSeconds: 60 * 60 },
  scan: { limit: 30, windowSeconds: 60 * 60 },
  demo: { limit: 10, windowSeconds: 60 * 60 },
  passwordChange: { limit: 10, windowSeconds: 60 * 60 },
} as const;

function keyFor(bucket: string, identifier: string) {
  return `${bucket}:${crypto.createHash("sha256").update(identifier.toLowerCase()).digest("hex").slice(0, 32)}`;
}

/** Counts one hit and throws 429 when the limit is exceeded. */
export async function enforceRateLimit(
  bucket: keyof typeof LIMITS,
  identifier: string,
  override?: { limit: number; windowSeconds: number }
): Promise<void> {
  const { limit, windowSeconds } = override ?? LIMITS[bucket];
  const { count, resetAt } = await getStore().hitRateLimit(keyFor(bucket, identifier), windowSeconds);
  if (count > limit) throw tooManyRequests((resetAt.getTime() - Date.now()) / 1000);
}
