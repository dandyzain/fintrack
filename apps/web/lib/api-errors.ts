import { NextResponse } from "next/server";
import { Prisma } from "@fintrack/database";
import type { ApiResponse } from "@fintrack/shared";

const DATABASE_UNAVAILABLE_MESSAGE =
  "Layanan sedang tidak tersedia. Silakan coba lagi beberapa saat lagi.";
const INTERNAL_ERROR_MESSAGE =
  "Terjadi kesalahan pada server. Silakan coba lagi beberapa saat lagi.";

function isPrismaError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientValidationError
  );
}

/**
 * True when the database could not be reached or did not answer in time
 * (as opposed to a query that reached the database and was rejected).
 */
function isDatabaseUnavailable(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1xxx: connection/server errors; P2024: connection pool timeout.
    return error.code.startsWith("P1") || error.code === "P2024";
  }
  return false;
}

/**
 * Logs `error` server-side and returns a generic 5xx response that does not
 * expose the error's details: 503 when the database is unreachable, 500 otherwise.
 */
export function internalErrorResponse(context: string, error: unknown) {
  console.error(`Error in ${context}:`, error);
  const unavailable = isDatabaseUnavailable(error);
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: unavailable ? DATABASE_UNAVAILABLE_MESSAGE : INTERNAL_ERROR_MESSAGE,
    },
    { status: unavailable ? 503 : 500 }
  );
}

/**
 * Same as `internalErrorResponse` for Prisma errors; returns null for any
 * other error so the caller can keep its own handling (e.g. business-rule
 * errors whose messages are meant for the user).
 */
export function databaseErrorResponse(context: string, error: unknown) {
  return isPrismaError(error) ? internalErrorResponse(context, error) : null;
}
