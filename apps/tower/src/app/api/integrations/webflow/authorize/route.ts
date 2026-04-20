import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { towerCorsHeadersFor } from "@/server/tower-cors";
import { hasWebflowOAuthCredentials } from "@/server/webflow-proxy-token";
import { db } from "@/shared/lib/db";
import { webflowOauthAuthorizeState } from "@/shared/lib/db/auth-schema";

function resolveAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3100"
  ).replace(/\/$/, "");
}

// cms:write: Data API PATCH collection items (Beacon CMS-bound image replace).
const DEFAULT_SCOPES = "sites:read pages:read cms:read cms:write assets:read";

function buildWebflowAuthorizeUrl(state: string): string {
  const clientId = process.env.WEBFLOW_CLIENT_ID?.trim();
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI?.trim();
  if (!clientId || !redirectUri) {
    throw new Error("WEBFLOW_CLIENT_ID and WEBFLOW_REDIRECT_URI are required");
  }
  const scopes = (process.env.WEBFLOW_OAUTH_SCOPES ?? DEFAULT_SCOPES)
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

/** Dashboard / first-party: redirect to Webflow OAuth (state cookie + session cookie). */
export async function GET(request: Request) {
  if (!hasWebflowOAuthCredentials()) {
    return Response.json(
      { error: "WEBFLOW_CLIENT_ID and WEBFLOW_CLIENT_SECRET are required for OAuth" },
      { status: 500 }
    );
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const appUrl = resolveAppUrl();
  if (!session) {
    return NextResponse.redirect(
      `${appUrl}/sign-in?callbackUrl=${encodeURIComponent("/api/integrations/webflow/authorize")}`
    );
  }

  let url: string;
  try {
    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set("wf_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    url = buildWebflowAuthorizeUrl(state);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_url_failed";
    return Response.json({ error: msg }, { status: 500 });
  }

  return NextResponse.redirect(url);
}

/**
 * Designer extension: JSON `{ url }` + server-side `state` → user mapping (Bearer session).
 * Avoids relying on OAuth popup having a Tower session cookie.
 */
export async function POST(request: Request) {
  const corsHeaders = towerCorsHeadersFor(request);
  const jsonHeaders = new Headers({ "Content-Type": "application/json" });
  for (const [k, v] of Object.entries(corsHeaders)) {
    jsonHeaders.set(k, v);
  }

  if (!hasWebflowOAuthCredentials()) {
    return Response.json(
      { error: "WEBFLOW_CLIENT_ID and WEBFLOW_CLIENT_SECRET are required for OAuth" },
      { status: 500, headers: jsonHeaders }
    );
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: jsonHeaders });
  }

  try {
    const state = crypto.randomUUID();
    await db.insert(webflowOauthAuthorizeState).values({
      state,
      userId: session.user.id,
    });
    const url = buildWebflowAuthorizeUrl(state);
    return Response.json({ url }, { headers: jsonHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_url_failed";
    return Response.json({ error: msg }, { status: 500, headers: jsonHeaders });
  }
}
