import { NextResponse, type NextRequest } from "next/server";
import type { AuthUser } from "@fintrack/shared";
import {
  DEMO_SESSION_TTL_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/token";
import { HttpError, unauthorized } from "./errors";
import { errorResponse, ok } from "./http";
import { getStore } from "./store";
import type { UserRecord } from "./store/types";

function tokenFrom(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) || null : null;
}

/**
 * The signed-in user, or null. A token is accepted only if its signature and
 * expiry are valid AND its session version matches the user's current one
 * (so changing/resetting the password signs out every other device).
 */
export async function getSessionUser(request: Request): Promise<UserRecord | null> {
  const token = tokenFrom(request);
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await getStore().findUserById(payload.sub);
  if (!user || user.sessionVersion !== payload.sv) return null;
  return user;
}

export async function requireUser(request: Request): Promise<UserRecord> {
  const user = await getSessionUser(request);
  if (!user) throw unauthorized();
  return user;
}

export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    emailVerified: Boolean(user.emailVerifiedAt),
    isDemo: user.isDemo,
  };
}

/**
 * JSON response `{ user, token }` that also sets the session cookie. The web
 * app uses the httpOnly cookie; the mobile app sends the token as Bearer.
 */
export async function sessionResponse(user: UserRecord, init: { status?: number; message?: string } = {}) {
  const ttl = user.isDemo ? DEMO_SESSION_TTL_SECONDS : SESSION_TTL_SECONDS;
  const token = await signSessionToken({ sub: user.id, sv: user.sessionVersion, demo: user.isDemo }, ttl);
  const response = ok({ user: toAuthUser(user), token }, init);
  response.cookies.set({ ...sessionCookieOptions(ttl), value: token });
  return response;
}

export function clearSession(response: NextResponse) {
  response.cookies.set({ ...sessionCookieOptions(0), value: "" });
}

type RouteContext<P> = { params: P };

/**
 * Wraps a Route Handler that needs a signed-in user. Unauthenticated requests
 * get 401 (and a cleared cookie, so the browser can't loop between /login and
 * the app with a stale token); every error goes through `errorResponse`.
 */
export function withUser<P = Record<string, string>>(
  handler: (request: NextRequest, ctx: { user: UserRecord; params: P }) => Promise<Response>
) {
  return async (request: NextRequest, context: RouteContext<P>) => {
    try {
      const user = await requireUser(request);
      return await handler(request, { user, params: context?.params });
    } catch (err) {
      const res = errorResponse(err, request);
      if (err instanceof HttpError && err.status === 401 && request.headers.get("cookie")?.includes(SESSION_COOKIE_NAME)) {
        clearSession(res);
      }
      return res;
    }
  };
}

/** Wraps a public Route Handler with the same error handling. */
export function withErrors<P = Record<string, string>>(
  handler: (request: NextRequest, ctx: { params: P }) => Promise<Response>
) {
  return async (request: NextRequest, context: RouteContext<P>) => {
    try {
      return await handler(request, { params: context?.params });
    } catch (err) {
      return errorResponse(err, request);
    }
  };
}
