import { getClientIp } from "@/server/security/client-ip";
import { RateLimitError } from "@/server/security/rate-limit";
import { assertWebflowDesignerExchangeIpRateLimit } from "@/server/security/webflow-designer-exchange-rate-limit";
import { towerCorsHeadersFor } from "@/server/tower-cors";
import { normalizeWebflowAppKey } from "@/server/webflow-app-registry";
import { establishDesignerBetterAuthSession } from "@/server/webflow-designer-session-logic";
import { isWebflowSiteId } from "@/server/webflow-organization-sites";
import {
  collectWebflowIdTokenResolveBearers,
  resolveDesignerIdTokenAcrossCandidates,
} from "@/server/webflow-resolve-designer-id-token";

/** Well beyond any real Designer ID token (a compact JWT); rejects garbage before it reaches Webflow. */
const MAX_ID_TOKEN_LENGTH = 8192;

function jsonWithCors(request: Request, body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(towerCorsHeadersFor(request))) {
    headers.set(k, v);
  }
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function OPTIONS(request: Request) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(towerCorsHeadersFor(request))) {
    headers.set(k, v);
  }
  return new Response(null, { status: 204, headers });
}

/** Delete stored workspace tokens Webflow rejected as revoked (no refresh token exists to recover them). */
async function pruneRevokedWebflowTokens(
  orgIds: string[],
  app: ReturnType<typeof normalizeWebflowAppKey>
): Promise<void> {
  if (orgIds.length === 0) {
    return;
  }
  const { deleteOrganizationWebflowOAuthToken } = await import("@/server/webflow-proxy-token");
  for (const orgId of orgIds) {
    await deleteOrganizationWebflowOAuthToken(orgId, app);
    console.warn(
      `[tower/webflow-designer] pruned revoked Webflow token for org ${orgId}; reconnect required (no refresh token)`
    );
  }
}

/** 429 response when the per-IP exchange budget is exhausted, null when the request may proceed. */
async function guardExchangeRateLimit(request: Request): Promise<Response | null> {
  try {
    await assertWebflowDesignerExchangeIpRateLimit(getClientIp(request));
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonWithCors(request, { error: "rate_limited" }, { status: 429, headers: { "Retry-After": "600" } });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const limited = await guardExchangeRateLimit(request);
  if (limited) {
    return limited;
  }

  let parsed: { idToken?: string; app?: string; siteId?: unknown };
  try {
    parsed = (await request.json()) as { idToken?: string; app?: string; siteId?: unknown };
  } catch {
    return jsonWithCors(request, { error: "invalid_json" }, { status: 400 });
  }

  const idToken = typeof parsed.idToken === "string" ? parsed.idToken.trim() : "";
  if (!idToken) {
    return jsonWithCors(request, { error: "id_token_required" }, { status: 400 });
  }
  if (idToken.length > MAX_ID_TOKEN_LENGTH) {
    return jsonWithCors(request, { error: "id_token_invalid" }, { status: 400 });
  }

  // Which Webflow app issued this ID token — selects the matching app's resolve bearer (cross-app
  // resolves are rejected by Webflow). Untagged requests default to Beacon for back-compat.
  const app = normalizeWebflowAppKey(parsed.app);
  // Optional: the Designer site the ID token was issued on. Lets the resolve pick the token of the org
  // linked to that site instead of any other tenant's token. Ignored unless it looks like a site id.
  const siteId = isWebflowSiteId(parsed.siteId) ? parsed.siteId : null;
  const candidates = await collectWebflowIdTokenResolveBearers(request, app, siteId);
  if (candidates.length === 0) {
    const bearerVar = app === "flint" ? "WEBFLOW_FLINT_TOKEN_RESOLVE_BEARER" : "WEBFLOW_TOKEN_RESOLVE_BEARER";
    return jsonWithCors(
      request,
      {
        error: "webflow_resolve_bearer_missing",
        hint: `No resolve bearer for the ${app} app. Set ${bearerVar} to a ${app}-app Data Client token (scope authorized_user:read)${
          app === "beacon" ? ", or connect Webflow on Tower so a stored workspace token can resolve it" : ""
        }.`,
      },
      { status: 503 }
    );
  }

  // Try every candidate, not just the first: an ID token resolves only against its own workspace's token.
  const resolution = await resolveDesignerIdTokenAcrossCandidates(idToken, candidates);
  await pruneRevokedWebflowTokens(resolution.orgIdsToPrune, app);

  if (!resolution.ok) {
    const { error, status, hint } = resolution.response;
    return jsonWithCors(request, hint ? { error, hint } : { error }, { status });
  }

  const session = await establishDesignerBetterAuthSession(resolution.user);
  if (!session.ok) {
    // Log the Webflow user id, not the email (PII stays out of function logs).
    console.warn(
      `[tower/webflow-designer] establish session failed for webflow user ${resolution.user.id}: ${session.status} ${session.message}`
    );
    return jsonWithCors(request, { error: session.message }, { status: session.status });
  }

  return jsonWithCors(request, {
    user: session.user,
    token: session.token,
  });
}
