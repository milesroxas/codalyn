import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { exchangeWebflowAuthorizationCode, type WebflowOAuthTokenResponse } from "@/server/webflow-oauth-exchange";
import { db } from "@/shared/lib/db";
import { webflowOAuthToken, webflowOauthAuthorizeState } from "@/shared/lib/db/auth-schema";

function resolveAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3100"
  ).replace(/\/$/, "");
}

function oauthErrorRedirect(appUrl: string, params: Record<string, string>): NextResponse {
  const q = new URLSearchParams({ ...params, popup: "1" });
  return NextResponse.redirect(`${appUrl}/integrations/webflow/error?${q.toString()}`);
}

/**
 * Persists Webflow OAuth access (and optional refresh) token server-side only.
 * Matches the Data Client flow: exchange `code` for tokens, store in your app DB — never ship the access token to the client.
 * @see https://developers.webflow.com/apps/docs/data-clients/build-a-data-client#oauth-authentication
 */
async function persistWebflowOAuthToken(userId: string, tokenResponse: WebflowOAuthTokenResponse) {
  const expiresIn = tokenResponse.expires_in;
  const expiresAt =
    typeof expiresIn === "number" && Number.isFinite(expiresIn) ? new Date(Date.now() + expiresIn * 1000) : null;

  await db
    .insert(webflowOAuthToken)
    .values({
      userId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? null,
      expiresAt,
      scope: tokenResponse.scope ?? null,
    })
    .onConflictDoUpdate({
      target: webflowOAuthToken.userId,
      set: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? null,
        expiresAt,
        scope: tokenResponse.scope ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function GET(request: Request) {
  const appUrl = resolveAppUrl();
  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const oauthDesc = searchParams.get("error_description");
    const errParams: Record<string, string> = { error: oauthError };
    if (oauthDesc) {
      errParams.error_description = oauthDesc;
    }
    return oauthErrorRedirect(appUrl, errParams);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return oauthErrorRedirect(appUrl, { error: "missing_code" });
  }

  const cookieStore = await cookies();
  const cookieExpected = cookieStore.get("wf_oauth_state")?.value;
  let userId: string | undefined;

  if (cookieExpected && cookieExpected === state) {
    cookieStore.delete("wf_oauth_state");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    userId = session?.user?.id;
  } else {
    const rows = await db
      .select({ userId: webflowOauthAuthorizeState.userId })
      .from(webflowOauthAuthorizeState)
      .where(eq(webflowOauthAuthorizeState.state, state))
      .limit(1);
    userId = rows[0]?.userId;
    if (userId) {
      await db.delete(webflowOauthAuthorizeState).where(eq(webflowOauthAuthorizeState.state, state));
    }
  }

  if (!userId) {
    cookieStore.delete("wf_oauth_state");
    return oauthErrorRedirect(appUrl, { error: "invalid_state" });
  }

  let tokenResponse: WebflowOAuthTokenResponse;
  try {
    tokenResponse = await exchangeWebflowAuthorizationCode(code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_exchange_failed";
    return oauthErrorRedirect(appUrl, {
      error: "token_exchange",
      detail: msg,
    });
  }

  await persistWebflowOAuthToken(userId, tokenResponse);
  return NextResponse.redirect(`${appUrl}/integrations/webflow/success?popup=1`);
}
