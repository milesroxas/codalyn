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
      "Authorization, Content-Type, Accept, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site",
    "Access-Control-Expose-Headers": "set-auth-token",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && (allowlist.has(origin) || isWebflowDesignerExtensionOrigin(origin))) {
    const allowed: Record<string, string> = {
      ...base,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    };
    // Private Network Access: only a local-dev Tower (private address) reached from a public Designer
    // origin needs this, and the browser announces that case with the request header. Production
    // Tower is public, so the grant is never emitted there.
    if (request.headers.get("Access-Control-Request-Private-Network")?.trim().toLowerCase() === "true") {
      allowed["Access-Control-Allow-Private-Network"] = "true";
    }
    return allowed;
  }
  return {
    ...base,
    "Access-Control-Allow-Origin": "*",
  };
}
