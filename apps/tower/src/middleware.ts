import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { towerCorsHeadersFor } from "@/server/tower-cors";

function needsCors(pathname: string): boolean {
  return (
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/api/v2/webflow") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/integrations/webflow")
  );
}

/** Paths that stay reachable without a Tower session cookie (same-origin relative URLs only). */
const PUBLIC_PREFIXES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/request-access",
  "/invitations/accept",
  "/integrations/webflow/success",
  "/integrations/webflow/error",
  "/integrations/beacon-popup-done",
] as const;

function isPublicPath(pathname: string): boolean {
  for (const prefix of PUBLIC_PREFIXES) {
    if (prefix === "/") {
      if (pathname === "/") {
        return true;
      }
      continue;
    }
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

function shouldSkipSessionGate(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname.startsWith("/api/");
}

function sanitizeCallbackTarget(pathname: string, search: string): string {
  const pathWithQuery = `${pathname}${search}`;
  if (!pathWithQuery.startsWith("/") || pathWithQuery.startsWith("//")) {
    return "/";
  }
  return pathWithQuery;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (needsCors(pathname)) {
    const cors = towerCorsHeadersFor(request);

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: cors });
    }

    const response = NextResponse.next();
    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
    return response;
  }

  if (shouldSkipSessionGate(pathname)) {
    return NextResponse.next();
  }

  if (!isPublicPath(pathname)) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.search = "";
      url.searchParams.set("callbackUrl", sanitizeCallbackTarget(pathname, request.nextUrl.search));
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
