import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { Prisma } from "@fintrack/database";
import type { ApiResponse } from "@fintrack/shared";
import { SessionSecretError } from "@/lib/auth/token";
import { ConfigError, HttpError, badRequest } from "./errors";
import { reportError } from "./logger";

export function ok<T>(data: T, init: { status?: number; message?: string; headers?: Record<string, string> } = {}) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data, ...(init.message ? { message: init.message } : {}) },
    { status: init.status ?? 200, headers: init.headers }
  );
}

function zodMessage(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Data yang dikirim tidak valid.";
  const field = issue.path.join(".");
  return issue.code === "custom" || !field ? issue.message : `${field}: ${issue.message}`;
}

/**
 * Converts any thrown value into a response. Only HttpError messages (written
 * for users) are shown; everything else is logged and answered generically.
 */
export function errorResponse(err: unknown, request?: Request): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: err.message, code: err.code, ...(err.details ? { details: err.details } : {}) },
      { status: err.status, headers: err.headers }
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json<ApiResponse>({ success: false, error: zodMessage(err), details: err.flatten() }, { status: 400 });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025" || err.code === "P2023") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Data tidak ditemukan." }, { status: 404 });
    }
    if (err.code === "P2002") {
      return NextResponse.json<ApiResponse>({ success: false, error: "Data yang sama sudah ada." }, { status: 409 });
    }
  }

  const misconfigured = err instanceof ConfigError || err instanceof SessionSecretError;
  const unavailable =
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(err.code));

  void reportError(err, {
    route: request ? new URL(request.url).pathname : undefined,
    method: request?.method,
  });

  if (misconfigured) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Server belum dikonfigurasi dengan benar. Hubungi pengelola aplikasi.", code: "SERVER_MISCONFIGURED" },
      { status: 503 }
    );
  }
  if (unavailable) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Database sedang tidak dapat dihubungi. Data Anda tidak disimpan—coba lagi sebentar lagi.", code: "DB_UNAVAILABLE" },
      { status: 503 }
    );
  }
  return NextResponse.json<ApiResponse>(
    { success: false, error: "Terjadi kesalahan pada server. Silakan coba lagi.", code: "INTERNAL" },
    { status: 500 }
  );
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest("Body permintaan harus berupa JSON yang valid.");
  }
}

export async function parseBody<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.infer<S>> {
  return parse(schema, await readJson(request));
}

export function parse<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const res = schema.safeParse(value);
  if (!res.success) throw res.error;
  return res.data;
}

export function searchParams(request: NextRequest | Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

/** Best-effort client IP (first X-Forwarded-For hop set by the platform proxy). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
