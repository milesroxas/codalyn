import type { NextRequest } from "next/server";
import { resolveTowerStaticBeaconRelatedOrigins } from "@/server/tower-static-beacon-origins";
import { isWebflowDesignerExtensionOrigin } from "@/server/tower-webflow-designer-origins";

/**
 * CORS for the Tower API routes the Beacon Designer Extension calls. Allowlist only: an allowlisted
 * `Origin` (static Beacon origins, `TOWER_CORS_ORIGINS`, Webflow Designer / extension hosts) is reflected
 * with credentials; any other origin, or a request without one, gets no `Access-Control-Allow-Origin`
 * at all — never a wildcard (Webflow Marketplace backend checklist: CORS allowlists production origins,
 * not `*`). CORS is defense-in-depth here; every route still authenticates the caller server-side.
 */
export function towerCorsHeadersFor(request: Request | NextRequest): Record<string, string> {
  const origin = request.headers.get("Origin");
  const extra = (process.env.TOWER_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowlist = new Set([...resolveTowerStaticBeaconRelatedOrigins(), ...extra]);
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site",
    "Access-Control-Expose-Headers": "set-auth-token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && (allowlist.has(origin) || isWebflowDesignerExtensionOrigin(origin))) {
    const allowed: Record<string, string> = {
      ...base,
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    };
    // Private Network Access: only a local-dev Tower (private address) reached from a public Designer
    // origin needs this, and the browser announces that case with the request header. Production
    // Tower is public, so the grant is never emitted there.
    if (request.headers.get("Access-Control-Request-Private-Network")?.trim().toLowerCase() === "true") {
      allowed["Access-Control-Allow-Private-Network"] = "true";
    }
    return allowed;
  }
  return base;
}
