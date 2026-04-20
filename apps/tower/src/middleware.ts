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

export function middleware(request: NextRequest) {
  if (!needsCors(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

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

export const config = {
  matcher: ["/api/v1/:path*", "/api/v2/webflow/:path*", "/api/auth/:path*", "/api/integrations/webflow/:path*"],
};
