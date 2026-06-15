import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { towerCorsHeadersFor } from "@/server/tower-cors";
import { canTowerUserManageWebflowOAuthViaDashboard } from "@/server/tower-webflow-oauth-team-admin";
import {
  normalizeWebflowAppKey,
  resolveWebflowAppClientCredentials,
  WEBFLOW_DATA_API_APP_KEY,
  type WebflowAppKey,
} from "@/server/webflow-app-registry";
import {
  resolveWebflowOAuthAppUrl,
  resolveWebflowOAuthRedirectUri,
  WEBFLOW_OAUTH_ORG_COOKIE,
  WEBFLOW_OAUTH_STATE_COOKIE,
  webflowOAuthPkceCookieOptions,
} from "@/server/webflow-oauth-config";
import { hasWebflowOAuthCredentials } from "@/server/webflow-proxy-token";
import { db } from "@/shared/lib/db";
import { webflowOauthAuthorizeState } from "@/shared/lib/db/auth-schema";
import { towerConnectionPathWithStatus } from "@/shared/lib/navigation/tower-app-paths";

// cms:write: Data API PATCH collection items (Beacon CMS-bound image replace).
// custom_code:*: Beacon page inline script (registered_scripts + page custom_code).
const BEACON_SCOPES =
  "sites:read pages:read cms:read cms:write assets:read assets:write custom_code:read custom_code:write authorized_user:read";
// Flint's linter is Designer-only; OAuth exists only to identify the user (ID-token resolve).
const FLINT_SCOPES = "sites:read authorized_user:read";

function scopesForApp(app: WebflowAppKey): string {
  if (app === "flint") {
    return process.env.WEBFLOW_FLINT_OAUTH_SCOPES ?? FLINT_SCOPES;
  }
  return process.env.WEBFLOW_OAUTH_SCOPES ?? BEACON_SCOPES;
}

function buildWebflowAuthorizeUrl(state: string, app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY): string {
  const { clientId } = resolveWebflowAppClientCredentials(app);
  const redirectUri = resolveWebflowOAuthRedirectUri();
  if (!clientId) {
    throw new Error(`WEBFLOW_${app.toUpperCase()}_CLIENT_ID (or legacy WEBFLOW_CLIENT_ID for beacon) is required`);
  }
  const scopes = scopesForApp(app)
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const scopeParam = encodeURIComponent(scopes.join(" "));
  return (
    `https://webflow.com/oauth/authorize?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopeParam}` +
    `&state=${encodeURIComponent(state)}`
  );
}

export async function OPTIONS(request: Request) {
  const headers = new Headers();
  for (const [k, v] of Object.entries(towerCorsHeadersFor(request))) {
    headers.set(k, v);
  }
  return new Response(null, { status: 204, headers });
}

/** Dashboard / first-party: redirect to Webflow OAuth (state cookie + session cookie). Team admin/owner on active workspace only. */
export async function GET(request: Request) {
  const app = normalizeWebflowAppKey(new URL(request.url).searchParams.get("app"));
  if (!hasWebflowOAuthCredentials(app)) {
    return Response.json({ error: `OAuth credentials for the ${app} app are not configured` }, { status: 500 });
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const appUrl = resolveWebflowOAuthAppUrl();
  if (!session) {
    return NextResponse.redirect(
      `${appUrl}/sign-in?callbackUrl=${encodeURIComponent("/api/integrations/webflow/authorize")}`
    );
  }

  const allowed = await canTowerUserManageWebflowOAuthViaDashboard(session.user.id, request.headers);
  if (!allowed) {
    return NextResponse.redirect(`${appUrl}${towerConnectionPathWithStatus("team_admin_required")}`);
  }

  const activeOrganizationId = await getActiveOrganizationIdForAuthHeaders(request.headers);
  if (!activeOrganizationId) {
    return NextResponse.redirect(`${appUrl}${towerConnectionPathWithStatus("no_active_workspace")}`);
  }

  let url: string;
  try {
    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set(WEBFLOW_OAUTH_STATE_COOKIE, state, webflowOAuthPkceCookieOptions);
    cookieStore.set(WEBFLOW_OAUTH_ORG_COOKIE, activeOrganizationId, webflowOAuthPkceCookieOptions);
    url = buildWebflowAuthorizeUrl(state, app);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_url_failed";
    return Response.json({ error: msg }, { status: 500 });
  }

  return NextResponse.redirect(url);
}

/**
 * Designer extension: JSON `{ url }` + server-side `state` → user + workspace mapping (Bearer session).
 * Team admin/owner on active workspace only.
 */
export async function POST(request: Request) {
  const corsHeaders = towerCorsHeadersFor(request);
  const jsonHeaders = new Headers({ "Content-Type": "application/json" });
  for (const [k, v] of Object.entries(corsHeaders)) {
    jsonHeaders.set(k, v);
  }

  const app = normalizeWebflowAppKey(new URL(request.url).searchParams.get("app"));
  if (!hasWebflowOAuthCredentials(app)) {
    return Response.json(
      { error: `OAuth credentials for the ${app} app are not configured` },
      { status: 500, headers: jsonHeaders }
    );
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: jsonHeaders });
  }

  const activeOrganizationId = await getActiveOrganizationIdForAuthHeaders(request.headers);
  if (!activeOrganizationId) {
    return Response.json({ error: "no_active_workspace" }, { status: 400, headers: jsonHeaders });
  }

  const allowed = await canTowerUserManageWebflowOAuthViaDashboard(session.user.id, request.headers);
  if (!allowed) {
    return Response.json({ error: "team_admin_required" }, { status: 403, headers: jsonHeaders });
  }

  try {
    const state = crypto.randomUUID();
    await db.insert(webflowOauthAuthorizeState).values({
      state,
      userId: session.user.id,
      organizationId: activeOrganizationId,
      appKey: app,
    });
    const url = buildWebflowAuthorizeUrl(state, app);
    return Response.json({ url }, { headers: jsonHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_url_failed";
    return Response.json({ error: msg }, { status: 500, headers: jsonHeaders });
  }
}
