/**
 * Runs once when a Next.js server instance starts (`next start`, `next dev`,
 * or a serverless cold start). Not run by `next build`.
 *
 * Fails fast in production when no session secret is configured, instead of
 * waiting for the first login or authenticated request to hit the error.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getSessionSecret } = await import("./lib/session-secret");
    getSessionSecret();
  }
}
