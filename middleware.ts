import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — allow through without auth check
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    (pathname === "/api/app-config" && request.method === "GET")
  ) {
    return NextResponse.next();
  }

  // Check for NextAuth session cookie (v5 uses authjs.*, v4 uses next-auth.*)
  const token =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token") ||
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
