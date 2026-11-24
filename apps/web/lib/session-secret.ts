/**
 * Resolves the HMAC secret used to sign and verify `fintrack_session` tokens.
 *
 * Production (NODE_ENV === "production"): SESSION_SECRET (or the legacy
 * JWT_SECRET) MUST be set. Without it this throws instead of falling back to a
 * value committed to the repo, because anyone who knows the signing key can mint
 * a valid session for any user.
 *
 * Development / test: falls back to a fixed, clearly-insecure key so local
 * `next dev` works without extra setup. That fallback is never used in production.
 *
 * Kept free of Next.js imports so it can also be called from instrumentation.ts.
 */

const DEV_ONLY_FALLBACK_SECRET = "fintrack-dev-only-insecure-session-secret";

function readSecretFromEnv(): string | null {
  for (const value of [process.env.SESSION_SECRET, process.env.JWT_SECRET]) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function getSessionSecret(): string {
  const secret = readSecretFromEnv();
  const isProduction = process.env.NODE_ENV === "production";

  if (secret) {
    if (isProduction && secret === DEV_ONLY_FALLBACK_SECRET) {
      throw new Error(
        "SESSION_SECRET is set to the public development fallback value. " +
          "Set it to a long random string (e.g. `openssl rand -base64 48`)."
      );
    }
    return secret;
  }

  if (isProduction) {
    throw new Error(
      "SESSION_SECRET is not set. FinTrack refuses to sign or verify session " +
        "tokens in production without it. Set SESSION_SECRET to a long random " +
        "string (e.g. `openssl rand -base64 48`)."
    );
  }

  // globalThis, not a module variable: each route bundle gets its own copy of
  // this module, and the warning only needs to appear once per process.
  const g = globalThis as { __fintrackDevSecretWarned?: boolean };
  if (!g.__fintrackDevSecretWarned) {
    g.__fintrackDevSecretWarned = true;
    console.warn(
      "[fintrack] SESSION_SECRET is not set; using an insecure development-only " +
        "fallback. This is refused when NODE_ENV=production."
    );
  }
  return DEV_ONLY_FALLBACK_SECRET;
}
