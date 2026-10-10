import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "fintrack_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  "fintrack-secret-key-pastel-ai-2026-very-secure";

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) {
    str += "=";
  }
  return Buffer.from(str, "base64").toString("utf-8");
}

export function signSessionToken(
  user: { userId: string; name: string; email: string },
  expiresInSeconds: number = 7 * 24 * 3600
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload: SessionPayload = { ...user, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (signature !== expectedSignature) return null;

    const payload: SessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  try {
    cookies().set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
  } catch (err) {
    // cookies() may throw if called outside server actions/route handlers
  }
}

export function clearSessionCookie() {
  try {
    cookies().set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch (err) {
    // ignore
  }
}

export function getSessionFromRequest(
  request?: NextRequest | Request
): SessionPayload | null {
  let token: string | undefined;

  // 1. Check Authorization Bearer header
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  // 2. Check cookies from NextRequest or request header
  if (!token && request) {
    if ("cookies" in request && typeof request.cookies?.get === "function") {
      token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    } else {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(
        new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`)
      );
      if (match) token = match[1];
    }
  }

  // 3. Fallback to cookies() from next/headers
  if (!token) {
    try {
      token = cookies().get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // not in a server component / route handler context
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

export { SESSION_COOKIE_NAME };
