/**
 * Structured server logging plus optional error reporting.
 *
 * Logs are single-line JSON (searchable in Vercel/any log drain). When
 * SENTRY_DSN is set, unexpected errors are also sent to Sentry through its
 * public envelope endpoint, so no SDK or build plugin is needed.
 */

type Level = "info" | "warn" | "error";

function write(level: Level, message: string, context: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...context });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};

function serializeError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return { name: "NonError", message: String(err) };
}

interface ParsedDsn {
  envelopeUrl: string;
  publicKey: string;
}

let parsedDsn: ParsedDsn | null | undefined;

function sentryTarget(): ParsedDsn | null {
  if (parsedDsn !== undefined) return parsedDsn;
  const dsn = process.env.SENTRY_DSN;
  parsedDsn = null;
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, "");
    if (!url.username || !projectId) return null;
    parsedDsn = { envelopeUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`, publicKey: url.username };
  } catch {
    parsedDsn = null;
  }
  return parsedDsn;
}

async function sendToSentry(err: unknown, context: Record<string, unknown>) {
  const target = sentryTarget();
  if (!target) return;
  const e = serializeError(err);
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    exception: { values: [{ type: e.name, value: e.message, stacktrace: undefined }] },
    extra: { ...context, stack: e.stack },
  };
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");
  await fetch(target.envelopeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=fintrack/1.0, sentry_key=${target.publicKey}`,
    },
    body: envelope,
    signal: AbortSignal.timeout(2000),
  });
}

/** Logs an unexpected error and reports it (best effort, never throws). */
export async function reportError(err: unknown, context: Record<string, unknown> = {}): Promise<void> {
  write("error", "unhandled_error", { ...context, error: serializeError(err) });
  try {
    await sendToSentry(err, context);
  } catch {
    /* reporting must never break the request */
  }
}
