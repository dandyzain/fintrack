import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, SessionSecretError, verifySessionToken } from "@/lib/auth/token";

/** Pages a guest may open. Everything else in the app requires a session. */
const PUBLIC_PAGES = new Set(["/welcome", "/privacy", "/terms"]);
/** Auth pages: a signed-in user is sent to the dashboard instead. */
const AUTH_PAGES = new Set(["/login", "/register", "/demo", "/forgot-password"]);
/** Reachable by everyone (the token in the link is what matters). */
const TOKEN_PAGES = new Set(["/reset-password", "/verify-email"]);

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    // Signature and expiry are checked here; the session version is checked by the API.
    return (await verifySessionToken(token)) !== null;
  } catch (err) {
    if (err instanceof SessionSecretError) console.error(`[fintrack] ${err.message}`);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes authenticate every request themselves (401 JSON).
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_PAGES.has(pathname) || TOKEN_PAGES.has(pathname)) return NextResponse.next();

  const signedIn = await hasValidSession(request);

  if (AUTH_PAGES.has(pathname)) {
    if (signedIn) return NextResponse.redirect(new URL("/", request.url));
    const res = NextResponse.next();
    // Drop an expired/invalid cookie so the browser doesn't keep sending it.
    if (request.cookies.has(SESSION_COOKIE_NAME)) res.cookies.delete(SESSION_COOKIE_NAME);
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
