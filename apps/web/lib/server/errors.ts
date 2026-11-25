/**
 * Errors that are safe to show to the user. Anything else that reaches a route
 * handler is logged and answered with a generic 500, so stack traces, SQL and
 * provider responses never leak to the browser.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    code = "ERROR",
    opts: { details?: unknown; headers?: Record<string, string> } = {}
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = opts.details;
    this.headers = opts.headers;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, "BAD_REQUEST", { details });

export const unauthorized = (message = "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.") =>
  new HttpError(401, message, "UNAUTHORIZED");

export const forbidden = (message = "Anda tidak memiliki akses ke sumber daya ini.") =>
  new HttpError(403, message, "FORBIDDEN");

export const notFound = (message = "Data tidak ditemukan.") => new HttpError(404, message, "NOT_FOUND");

export const conflict = (message: string) => new HttpError(409, message, "CONFLICT");

export const tooManyRequests = (retryAfterSeconds: number) =>
  new HttpError(
    429,
    `Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} menit.`,
    "RATE_LIMITED",
    { headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))) } }
  );

export const serviceUnavailable = (message: string, code = "UNAVAILABLE") => new HttpError(503, message, code);

/** Thrown when a required setting (e.g. SESSION_SECRET) is missing in production. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
