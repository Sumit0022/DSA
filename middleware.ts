// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Exclude static files, images, and API routes from the redirect loop
  if (
    pathname.startsWith("/_next") || 
    pathname.startsWith("/api") || 
    pathname.includes(".") 
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("dsa_admin_session")?.value;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin-login";

  // 2. Logic to prevent infinite redirect loops
  if (isAdminRoute && !sessionToken && pathname !== "/admin-login") {
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  if (isLoginRoute && sessionToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};