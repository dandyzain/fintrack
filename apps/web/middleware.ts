import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("fintrack_session")?.value;
  const hasValidTokenFormat =
    typeof sessionCookie === "string" &&
    sessionCookie.trim().length > 0 &&
    sessionCookie.split(".").length === 3;

  // 1. API routes handle their own auth responses (e.g. 401 JSON)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 2. Public auth pages
  const isAuthPage = pathname === "/login" || pathname === "/register";

  // If user has a valid session token and visits login or register -> redirect to dashboard
  if (hasValidTokenFormat && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user does NOT have a valid session token and visits protected page (e.g. root '/')
  if (!hasValidTokenFormat && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
