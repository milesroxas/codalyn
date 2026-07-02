import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { towerCorsHeadersFor } from "@/server/tower-cors";
import {
  buildTowerAppUrl,
  isFlintMarketingHost,
  isHostSplitEnabled,
  isMarketingHost,
  normalizeHostname,
  sanitizeRelativePath,
} from "@/server/tower-hosts";
import { readTowerSessionCookie } from "@/server/tower-session-cookie";
import { TOWER_AUTH_SURFACE_PATHS } from "@/shared/lib/navigation/tower-auth-surfaces";
import { isTowerMarketingPublicPath, TOWER_SUPPORT_PATH } from "@/shared/lib/navigation/tower-marketing-paths";

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
  ...TOWER_AUTH_SURFACE_PATHS,
  TOWER_SUPPORT_PATH,
  "/terms",
  "/privacy",
  "/integrations/webflow/success",
  "/integrations/webflow/error",
  "/integrations/beacon-popup-done",
] as const;

const FLINT_MARKETING_PUBLIC_PATHS = ["/", "/flint", "/terms", "/privacy"] as const;

function isFlintMarketingPublicPath(pathname: string, hostname: string): boolean {
  return isFlintMarketingHost(hostname) && FLINT_MARKETING_PUBLIC_PATHS.some((path) => pathname === path);
}

function isUnifiedMarketingProductPath(pathname: string): boolean {
  return !isHostSplitEnabled() && (pathname === "/tower" || pathname === "/beacon" || pathname === "/flint");
}

function matchesPublicPrefix(pathname: string): boolean {
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

function isPublicPath(pathname: string, hostname: string): boolean {
  if (isFlintMarketingPublicPath(pathname, hostname)) {
    return true;
  }
  if (isMarketingHost(hostname) && isTowerMarketingPublicPath(pathname)) {
    return true;
  }
  if (isUnifiedMarketingProductPath(pathname)) {
    return true;
  }
  return matchesPublicPrefix(pathname);
}

function shouldSkipSessionGate(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname.startsWith("/api/");
}

function applyFlintMarketingHostRouting(request: NextRequest, pathname: string): NextResponse | null {
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/flint", request.url));
  }
  if (pathname === "/flint" || pathname === "/terms" || pathname === "/privacy") {
    return null;
  }
  return NextResponse.redirect(buildTowerAppUrl(pathname, request.nextUrl.search));
}

function applyHostSplitRouting(request: NextRequest, pathname: string): NextResponse | null {
  if (!isHostSplitEnabled()) {
    return null;
  }

  const hostname = normalizeHostname(request.headers.get("host") ?? request.nextUrl.hostname);
  const sessionCookie = readTowerSessionCookie(request);

  if (isFlintMarketingHost(hostname)) {
    return applyFlintMarketingHostRouting(request, pathname);
  }

  if (isMarketingHost(hostname)) {
    if (!isTowerMarketingPublicPath(pathname)) {
      return NextResponse.redirect(buildTowerAppUrl(pathname, request.nextUrl.search));
    }
    if (pathname === "/" && sessionCookie) {
      return NextResponse.redirect(buildTowerAppUrl("/auth/continue", request.nextUrl.search));
    }
    return null;
  }

  return null;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const hostSplitRedirect = applyHostSplitRouting(request, pathname);
  if (hostSplitRedirect) {
    return hostSplitRedirect;
  }

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

  const hostname = normalizeHostname(request.headers.get("host") ?? request.nextUrl.hostname);

  if (!isPublicPath(pathname, hostname)) {
    const sessionCookie = readTowerSessionCookie(request);
    if (!sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.search = "";
      url.searchParams.set("callbackUrl", sanitizeRelativePath(pathname, request.nextUrl.search));
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
