import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, SessionSecretError, verifySessionToken } from "@/lib/auth/token";

/** Pages a guest may open. Everything else in the app requires a session. */
const PUBLIC_PAGES = new Set(["/welcome", "/privacy", "/terms"]);
/** Auth pages: a signed-in user is sent to the dashboard instead. */
const AUTH_PAGES = new Set(["/login", "/register", "/demo", "/forgot-password"]);
/** Reachable by everyone (the token in the link is what matters). */
const TOKEN_PAGES = new Set(["/reset-password", "/verify-email"]);

async function readSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    // Signature and expiry are checked here; the session version is checked by the API.
    return await verifySessionToken(token);
  } catch (err) {
    if (err instanceof SessionSecretError) console.error(`[fintrack] ${err.message}`);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes authenticate every request themselves (401 JSON).
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_PAGES.has(pathname) || TOKEN_PAGES.has(pathname)) return NextResponse.next();

  const session = await readSession(request);
  const signedIn = session !== null;

  if (AUTH_PAGES.has(pathname)) {
    // Demo visitors may still sign in or create a real account (it replaces the sandbox session).
    if (signedIn && !(session.demo && (pathname === "/register" || pathname === "/login"))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const res = NextResponse.next();
    // Drop an expired/invalid cookie so the browser doesn't keep sending it.
    if (!signedIn && request.cookies.has(SESSION_COOKIE_NAME)) res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  if (!signedIn) {
    // Guests visiting the root see the public landing page (URL stays "/").
    if (pathname === "/") return NextResponse.rewrite(new URL("/welcome", request.url));
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname);
    const res = NextResponse.redirect(login);
    if (request.cookies.has(SESSION_COOKIE_NAME)) res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
