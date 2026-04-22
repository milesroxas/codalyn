import type { NextRequest } from "next/server";

/** Beacon Designer Extension host (Webflow); add others via `TOWER_CORS_ORIGINS`. */
const defaultOrigins = [
  "http://localhost:1337",
  "http://127.0.0.1:1337",
  "http://localhost:3100",
  "https://69e2b49536eded7411b48cf6.webflow-ext.com",
] as const;

function isWebflowDesignerExtensionOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "design.webflow.com" ||
      hostname.endsWith(".design.webflow.com") ||
      hostname.endsWith(".webflow-ext.com")
    );
  } catch {
    return false;
  }
}

export function towerCorsHeadersFor(request: Request | NextRequest): Record<string, string> {
  const origin = request.headers.get("Origin");
  const extra = (process.env.TOWER_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowlist = new Set([...defaultOrigins, ...extra]);
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, X-Beacon-Tower-User-Id, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site",
    "Access-Control-Expose-Headers": "set-auth-token",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Private-Network": "true",
  };
  if (origin && (allowlist.has(origin) || isWebflowDesignerExtensionOrigin(origin))) {
    return {
      ...base,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    };
  }
  return {
    ...base,
    "Access-Control-Allow-Origin": "*",
  };
}
