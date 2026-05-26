import type { NextRequest } from "next/server";
import { TOWER_STATIC_BEACON_RELATED_ORIGINS } from "@/server/tower-static-beacon-origins";
import { isWebflowDesignerExtensionOrigin } from "@/server/tower-webflow-designer-origins";

export function towerCorsHeadersFor(request: Request | NextRequest): Record<string, string> {
  const origin = request.headers.get("Origin");
  const extra = (process.env.TOWER_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowlist = new Set([...TOWER_STATIC_BEACON_RELATED_ORIGINS, ...extra]);
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
