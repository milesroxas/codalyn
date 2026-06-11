import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import {
  buildWebflowOAuthFinishSignInUrl,
  completeWebflowOAuthForOrganization,
  resolveWebflowOAuthCallbackKind,
  stageWebflowInitiatedInstallFromCallback,
} from "@/server/webflow-oauth-completion";
import {
  resolveWebflowOAuthAppUrl,
  resolveWebflowOAuthRedirectUri,
  WEBFLOW_OAUTH_FINISH_PATH,
  WEBFLOW_OAUTH_INSTALL_PENDING_COOKIE,
  WEBFLOW_OAUTH_ORG_COOKIE,
  WEBFLOW_OAUTH_STATE_COOKIE,
  webflowOAuthInstallPendingCookieOptions,
} from "@/server/webflow-oauth-config";
import { exchangeWebflowAuthorizationCode, type WebflowOAuthTokenResponse } from "@/server/webflow-oauth-exchange";
import { persistOrganizationWebflowOAuthToken } from "@/server/webflow-oauth-persist";
import { db } from "@/shared/lib/db";
import { webflowOauthAuthorizeState } from "@/shared/lib/db/auth-schema";
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

function oauthSuccessRedirect(appUrl: string, { popup }: { popup: boolean }): NextResponse {
  if (popup) {
    return NextResponse.redirect(`${appUrl}/integrations/webflow/success?popup=1`);
  }
  return NextResponse.redirect(`${appUrl}${towerConnectionPathWithStatus("connected")}`);
}

function clearWebflowOauthCookies(cookieStore: CookieStore): void {
  cookieStore.delete(WEBFLOW_OAUTH_STATE_COOKIE);
  cookieStore.delete(WEBFLOW_OAUTH_ORG_COOKIE);
}

async function resolveOrganizationFromCookieFlow(
  request: Request,
  cookieStore: CookieStore,
  appUrl: string,
  isPopupFlow: boolean
): Promise<{ organizationId: string } | { error: NextResponse }> {
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
): Promise<{ organizationId: string } | { error: NextResponse }> {
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

async function tryCompleteWebflowInitiatedInstallInSession(
  request: Request,
  authorizationCode: string,
  redirectUri: string,
  appUrl: string,
  isPopupFlow: boolean
): Promise<NextResponse | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    return null;
  }

  const activeOrganizationId = await getActiveOrganizationIdForAuthHeaders(request.headers);
  if (!activeOrganizationId) {
    return null;
  }

  const admin = await isTowerTeamAdminMemberOfOrg(sessionUserId, activeOrganizationId);
  if (!admin) {
    return null;
  }

  const result = await completeWebflowOAuthForOrganization({
    organizationId: activeOrganizationId,
    authorizationCode,
    redirectUri,
  });
  if (!result.ok) {
    return oauthErrorRedirect(appUrl, { error: result.error }, { popup: isPopupFlow });
  }

  return oauthSuccessRedirect(appUrl, { popup: isPopupFlow });
}

async function redirectToFinishStagedWebflowInstall(input: {
  authorizationCode: string;
  redirectUri: string;
  externalState: string | null;
  appUrl: string;
  cookieStore: CookieStore;
  request: Request;
}): Promise<NextResponse> {
  const pendingId = await stageWebflowInitiatedInstallFromCallback({
    authorizationCode: input.authorizationCode,
    redirectUri: input.redirectUri,
    externalState: input.externalState,
  });
  input.cookieStore.set(WEBFLOW_OAUTH_INSTALL_PENDING_COOKIE, pendingId, webflowOAuthInstallPendingCookieOptions);

  const session = await auth.api.getSession({ headers: input.request.headers });
  if (session?.user?.id) {
    return NextResponse.redirect(`${input.appUrl}${WEBFLOW_OAUTH_FINISH_PATH}`);
  }

  return NextResponse.redirect(buildWebflowOAuthFinishSignInUrl(input.appUrl));
}

export async function GET(request: Request) {
  const appUrl = resolveWebflowOAuthAppUrl();
  const redirectUri = resolveWebflowOAuthRedirectUri();
  const { searchParams } = new URL(request.url);
  const cookieStore = await cookies();
  const cookieExpected = cookieStore.get(WEBFLOW_OAUTH_STATE_COOKIE)?.value;
  const isPopupFlow = !cookieExpected;

  const { query, kind } = resolveWebflowOAuthCallbackKind(searchParams, cookieExpected);

  if (kind === "oauth_error") {
    clearWebflowOauthCookies(cookieStore);
    const errParams: Record<string, string> = { error: query.oauthError ?? "oauth_error" };
    if (query.oauthErrorDescription) {
      errParams.error_description = query.oauthErrorDescription;
    }
    return oauthErrorRedirect(appUrl, errParams, { popup: isPopupFlow });
  }

  if (kind === "missing_code") {
    clearWebflowOauthCookies(cookieStore);
    return oauthErrorRedirect(appUrl, { error: "missing_code" }, { popup: isPopupFlow });
  }

  const code = query.code;
  if (!code) {
    clearWebflowOauthCookies(cookieStore);
    return oauthErrorRedirect(appUrl, { error: "missing_code" }, { popup: isPopupFlow });
  }

  if (kind === "webflow_initiated_install") {
    clearWebflowOauthCookies(cookieStore);
    const immediate = await tryCompleteWebflowInitiatedInstallInSession(
      request,
      code,
      redirectUri,
      appUrl,
      isPopupFlow
    );
    if (immediate) {
      return immediate;
    }
    return redirectToFinishStagedWebflowInstall({
      authorizationCode: code,
      redirectUri,
      externalState: query.state,
      appUrl,
      cookieStore,
      request,
    });
  }

  const state = query.state?.trim();
  if (!state) {
    clearWebflowOauthCookies(cookieStore);
    return oauthErrorRedirect(appUrl, { error: "missing_code" }, { popup: isPopupFlow });
  }

  const resolved =
    kind === "tower_cookie_state"
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
  return oauthSuccessRedirect(appUrl, { popup: isPopupFlow });
}
