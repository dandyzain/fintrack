import { prisma } from "@fintrack/database";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse } from "@fintrack/shared";
import { demoStore } from "./demo-store";
import { getSessionFromRequest, SESSION_COOKIE_NAME } from "./session";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Returns the currently authenticated user from session cookie or Bearer token,
 * or null if no valid session exists.
 */
export async function getCurrentUser(
  request?: NextRequest | Request
): Promise<CurrentUser | null> {
  const session = getSessionFromRequest(request);

  if (session && session.userId) {
    if (!process.env.DATABASE_URL) {
      const user = demoStore.getUserById(session.userId);
      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      }
    } else {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, name: true, email: true },
        });
        if (user) return user;
      } catch (err) {
        // Fallback to demo store if database throws
        const user = demoStore.getUserById(session.userId);
        if (user) {
          return { id: user.id, name: user.name, email: user.email };
        }
      }
    }
  }

  return null;
}

/**
 * True when no database is configured and the app runs entirely on the
 * in-memory demo store (local dev / portfolio sandbox).
 */
export function isDemoMode(): boolean {
  return !process.env.DATABASE_URL;
}

/**
 * Returns the authenticated user's ID, or null if the request has no valid
 * session.
 *
 * In demo mode (no DATABASE_URL) an unauthenticated request falls back to the
 * shared in-memory demo user so the sandbox keeps working. With a real database
 * there is no fallback: callers must reject the request (see
 * `unauthorizedResponse`).
 */
export async function getCurrentUserId(
  request?: NextRequest | Request
): Promise<string | null> {
  const user = await getCurrentUser(request);
  if (user) return user.id;

  if (isDemoMode()) return demoStore.userId;

  return null;
}

/**
 * Standard 401 response for API routes. Also expires the session cookie so a
 * stale or forged cookie can't bounce the browser between `/` and `/login`
 * (middleware only checks the cookie's shape, not its signature).
 */
export function unauthorizedResponse(): NextResponse<ApiResponse> {
  const response = NextResponse.json<ApiResponse>(
    {
      success: false,
      error: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
    },
    { status: 401 }
  );
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
