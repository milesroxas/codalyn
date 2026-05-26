import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import {
  resolveWebflowOAuthAppUrl,
  resolveWebflowOAuthRedirectUri,
  WEBFLOW_OAUTH_ORG_COOKIE,
  WEBFLOW_OAUTH_STATE_COOKIE,
} from "@/server/webflow-oauth-config";
import { exchangeWebflowAuthorizationCode, type WebflowOAuthTokenResponse } from "@/server/webflow-oauth-exchange";
import { db } from "@/shared/lib/db";
import { organizationWebflowOAuthToken, webflowOauthAuthorizeState } from "@/shared/lib/db/auth-schema";
import { towerConnectionPathWithStatus } from "@/shared/lib/navigation/tower-app-paths";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function oauthErrorRedirect(
  appUrl: string,
  params: Record<string, string>,
  { popup }: { popup: boolean } = { popup: true }
): NextResponse {
  const base: Record<string, string> = { ...params };
  if (popup) {
    base.popup = "1";
  }
  const q = new URLSearchParams(base);
  return NextResponse.redirect(`${appUrl}/integrations/webflow/error?${q.toString()}`);
}

function clearWebflowOauthCookies(cookieStore: CookieStore): void {
  cookieStore.delete(WEBFLOW_OAUTH_STATE_COOKIE);
  cookieStore.delete(WEBFLOW_OAUTH_ORG_COOKIE);
}

/**
 * Persists Webflow OAuth access (and optional refresh) token server-side on the workspace (`organizationId`) only.
 * Matches the Data Client flow: exchange `code` for tokens, store in your app DB — never ship the access token to the client.
 * @see https://developers.webflow.com/apps/docs/data-clients/build-a-data-client#oauth-authentication
 */
async function persistOrganizationWebflowOAuthToken(organizationId: string, tokenResponse: WebflowOAuthTokenResponse) {
  const expiresIn = tokenResponse.expires_in;
  const expiresAt =
    typeof expiresIn === "number" && Number.isFinite(expiresIn) ? new Date(Date.now() + expiresIn * 1000) : null;

  await db
    .insert(organizationWebflowOAuthToken)
    .values({
      organizationId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? null,
      expiresAt,
      scope: tokenResponse.scope ?? null,
    })
    .onConflictDoUpdate({
      target: organizationWebflowOAuthToken.organizationId,
      set: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? null,
        expiresAt,
        scope: tokenResponse.scope ?? null,
        updatedAt: new Date(),
      },
    });
}

type ResolvedOrg = { organizationId: string } | { error: NextResponse };

async function resolveOrganizationFromCookieFlow(
  request: Request,
  cookieStore: CookieStore,
  appUrl: string,
  isPopupFlow: boolean
): Promise<ResolvedOrg> {
  cookieStore.delete(WEBFLOW_OAUTH_STATE_COOKIE);
  const orgFromCookie = cookieStore.get(WEBFLOW_OAUTH_ORG_COOKIE)?.value?.trim();
  cookieStore.delete(WEBFLOW_OAUTH_ORG_COOKIE);
  const session = await auth.api.getSession({ headers: request.headers });
  const sessionUserId = session?.user?.id;
  if (!sessionUserId || !orgFromCookie) {
    return { error: oauthErrorRedirect(appUrl, { error: "invalid_state" }, { popup: isPopupFlow }) };
  }
  const admin = await isTowerTeamAdminMemberOfOrg(sessionUserId, orgFromCookie);
  if (!admin) {
    return { error: oauthErrorRedirect(appUrl, { error: "team_admin_required" }, { popup: isPopupFlow }) };
  }
  return { organizationId: orgFromCookie };
}

async function resolveOrganizationFromDbStateFlow(
  cookieStore: CookieStore,
  state: string,
  appUrl: string,
  isPopupFlow: boolean
): Promise<ResolvedOrg> {
  const rows = await db
    .select({
      userId: webflowOauthAuthorizeState.userId,
      organizationId: webflowOauthAuthorizeState.organizationId,
    })
    .from(webflowOauthAuthorizeState)
    .where(eq(webflowOauthAuthorizeState.state, state))
    .limit(1);
  const row = rows[0];
  if (row) {
    await db.delete(webflowOauthAuthorizeState).where(eq(webflowOauthAuthorizeState.state, state));
  }
  if (!row?.organizationId) {
    clearWebflowOauthCookies(cookieStore);
    return { error: oauthErrorRedirect(appUrl, { error: "invalid_state" }, { popup: isPopupFlow }) };
  }
  const stillAdmin = await isTowerTeamAdminMemberOfOrg(row.userId, row.organizationId);
  if (!stillAdmin) {
    return { error: oauthErrorRedirect(appUrl, { error: "team_admin_required" }, { popup: isPopupFlow }) };
  }
  return { organizationId: row.organizationId };
}

export async function GET(request: Request) {
  const appUrl = resolveWebflowOAuthAppUrl();
  const redirectUri = resolveWebflowOAuthRedirectUri();
  const { searchParams } = new URL(request.url);
  const cookieStore = await cookies();
  const cookieExpected = cookieStore.get(WEBFLOW_OAUTH_STATE_COOKIE)?.value;
  const isPopupFlow = !cookieExpected;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    clearWebflowOauthCookies(cookieStore);
    const oauthDesc = searchParams.get("error_description");
    const errParams: Record<string, string> = { error: oauthError };
    if (oauthDesc) {
      errParams.error_description = oauthDesc;
    }
    return oauthErrorRedirect(appUrl, errParams, { popup: isPopupFlow });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    clearWebflowOauthCookies(cookieStore);
    return oauthErrorRedirect(appUrl, { error: "missing_code" }, { popup: isPopupFlow });
  }

  const resolved =
    cookieExpected && cookieExpected === state
      ? await resolveOrganizationFromCookieFlow(request, cookieStore, appUrl, isPopupFlow)
      : await resolveOrganizationFromDbStateFlow(cookieStore, state, appUrl, isPopupFlow);

  if ("error" in resolved) {
    return resolved.error;
  }
  const { organizationId } = resolved;

  let tokenResponse: WebflowOAuthTokenResponse;
  try {
    tokenResponse = await exchangeWebflowAuthorizationCode(code, redirectUri);
  } catch {
    return oauthErrorRedirect(appUrl, { error: "token_exchange" }, { popup: isPopupFlow });
  }

  await persistOrganizationWebflowOAuthToken(organizationId, tokenResponse);
  if (isPopupFlow) {
    return NextResponse.redirect(`${appUrl}/integrations/webflow/success?popup=1`);
  }
  return NextResponse.redirect(`${appUrl}${towerConnectionPathWithStatus("connected")}`);
}
