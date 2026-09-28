import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import { normalizeWebflowAppKey, WEBFLOW_DATA_API_APP_KEY, type WebflowAppKey } from "@/server/webflow-app-registry";
import { bindWebflowUserToTowerUser } from "@/server/webflow-designer-identity";
import { resolveWebflowOAuthCallbackKind } from "@/server/webflow-oauth-completion";
import {
  resolveWebflowOAuthAppUrl,
  resolveWebflowOAuthRedirectUri,
  WEBFLOW_OAUTH_ORG_COOKIE,
  WEBFLOW_OAUTH_STATE_COOKIE,
} from "@/server/webflow-oauth-config";
import {
  exchangeWebflowAuthorizationCode,
  revokeWebflowAccessToken,
  type WebflowOAuthTokenResponse,
} from "@/server/webflow-oauth-exchange";
import { persistOrganizationWebflowOAuthToken } from "@/server/webflow-oauth-persist";
import { isWebflowOAuthApproverBound, validateWebflowOAuthStateRow } from "@/server/webflow-oauth-state-binding";
import { fetchWebflowAuthorizedUserId } from "@/server/webflow-token-identity";
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

type ResolvedConnectTarget = {
  organizationId: string;
  appKey: WebflowAppKey;
  /**
   * The Tower account completing this OAuth: the signed-in session for the dashboard / Marketplace-install
   * cookie flow, the state row's minter for the Designer flow. Recorded on the token as its install-time
   * account, and the approving Webflow user is linked to it (review round 9).
   */
  installerUserId: string;
  /**
   * Set for the Designer-initiated (DB-state) flow: the exchanged token must be proven (via Webflow
   * `token/authorized_by`) to belong to this Webflow user before it is stored. Undefined for the
   * dashboard cookie flow, which is bound to the browser session that started it.
   */
  requiredWebflowUserId?: string;
};

async function resolveOrganizationFromCookieFlow(
  request: Request,
  cookieStore: CookieStore,
  appUrl: string,
  isPopupFlow: boolean
): Promise<ResolvedConnectTarget | { error: NextResponse }> {
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
  // The first-party dashboard "Connect Webflow" flow is the Beacon Data API app.
  return { organizationId: orgFromCookie, appKey: WEBFLOW_DATA_API_APP_KEY, installerUserId: sessionUserId };
}

async function resolveOrganizationFromDbStateFlow(
  cookieStore: CookieStore,
  state: string,
  appUrl: string,
  isPopupFlow: boolean
): Promise<ResolvedConnectTarget | { error: NextResponse }> {
  const rows = await db
    .select({
      userId: webflowOauthAuthorizeState.userId,
      organizationId: webflowOauthAuthorizeState.organizationId,
      appKey: webflowOauthAuthorizeState.appKey,
      webflowAuthorizedUserId: webflowOauthAuthorizeState.webflowAuthorizedUserId,
      createdAt: webflowOauthAuthorizeState.createdAt,
    })
    .from(webflowOauthAuthorizeState)
    .where(eq(webflowOauthAuthorizeState.state, state))
    .limit(1);
  const row = rows[0];
  if (row) {
    // Single-use: consumed on first sight, whether or not it validates.
    await db.delete(webflowOauthAuthorizeState).where(eq(webflowOauthAuthorizeState.state, state));
  }
  const validated = validateWebflowOAuthStateRow(row, new Date());
  if (!validated.ok) {
    clearWebflowOauthCookies(cookieStore);
    return { error: oauthErrorRedirect(appUrl, { error: validated.error }, { popup: isPopupFlow }) };
  }
  const bound = validated.row;
  const stillAdmin = await isTowerTeamAdminMemberOfOrg(bound.userId, bound.organizationId);
  if (!stillAdmin) {
    return { error: oauthErrorRedirect(appUrl, { error: "team_admin_required" }, { popup: isPopupFlow }) };
  }
  return {
    organizationId: bound.organizationId,
    appKey: normalizeWebflowAppKey(bound.appKey),
    installerUserId: bound.userId,
    requiredWebflowUserId: bound.webflowAuthorizedUserId,
  };
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

  // No `state` = not a flow Tower started (every Tower authorize request mints one, including the
  // Marketplace install URL, which is Tower's own authorize route). Refuse before any code exchange:
  // exchanging a state-less code and binding it to whoever is signed in would let a forwarded callback
  // URL plant a third party's Webflow authorization into the victim's workspace (auth review 2026-09-18).
  const state = kind === "missing_state" ? "" : (query.state?.trim() ?? "");
  if (!state) {
    clearWebflowOauthCookies(cookieStore);
    return oauthErrorRedirect(appUrl, { error: "invalid_state" }, { popup: isPopupFlow });
  }

  const resolved =
    kind === "tower_cookie_state"
      ? await resolveOrganizationFromCookieFlow(request, cookieStore, appUrl, isPopupFlow)
      : await resolveOrganizationFromDbStateFlow(cookieStore, state, appUrl, isPopupFlow);

  if ("error" in resolved) {
    return resolved.error;
  }

  const outcome = await exchangeAndStoreConnectTarget(resolved, code, redirectUri);
  if (outcome !== "ok") {
    return oauthErrorRedirect(appUrl, { error: outcome }, { popup: isPopupFlow });
  }
  return oauthSuccessRedirect(appUrl, { popup: isPopupFlow });
}

type ExchangeAndStoreOutcome = "ok" | "token_exchange" | "identity_mismatch" | "token_storage";

/**
 * Exchanges the code and stores the token under the resolved org. For the Designer-initiated flow
 * (`requiredWebflowUserId` set) the approving Webflow user must be proven to be the minter first;
 * a token that fails binding or storage is revoked (best-effort) rather than left live.
 *
 * Every flow then records the install-time identity — the approving Webflow user (from
 * `token/authorized_by`) and the Tower account completing the OAuth — on the token row, and links the
 * approving Webflow user to that account, so opening the Designer as that Webflow user restores this
 * account and its authorization instead of matching e-mail addresses (review round 9, 2026-09-28).
 */
async function exchangeAndStoreConnectTarget(
  target: ResolvedConnectTarget,
  code: string,
  redirectUri: string
): Promise<ExchangeAndStoreOutcome> {
  const { organizationId, appKey, installerUserId, requiredWebflowUserId } = target;

  let tokenResponse: WebflowOAuthTokenResponse;
  try {
    tokenResponse = await exchangeWebflowAuthorizationCode(code, redirectUri, appKey);
  } catch {
    return "token_exchange";
  }

  const approver = await fetchWebflowAuthorizedUserId(tokenResponse.access_token);
  if (requiredWebflowUserId) {
    if (!isWebflowOAuthApproverBound(requiredWebflowUserId, approver)) {
      await revokeWebflowAccessToken(tokenResponse.access_token, appKey);
      console.warn(`[tower/webflow-oauth] callback identity mismatch for org ${organizationId}; token discarded`);
      return "identity_mismatch";
    }
  } else if (!approver) {
    // Cookie flow: the approver could not be read right now. The authorization is stored regardless; the
    // Designer exchange resolves the approver lazily from the stored token the next time it needs it.
    console.warn(`[tower/webflow-oauth] approver unknown for org ${organizationId}; identity resolved lazily`);
  }

  try {
    await persistOrganizationWebflowOAuthToken(organizationId, tokenResponse, appKey, {
      webflowAuthorizedUserId: approver,
      authorizedByUserId: installerUserId,
    });
  } catch (error) {
    // e.g. MissingSecretEncryptionKeyError in production — the token is never stored in plaintext.
    console.error(`[tower/webflow-oauth] token storage failed: ${error instanceof Error ? error.message : error}`);
    await revokeWebflowAccessToken(tokenResponse.access_token, appKey);
    return "token_storage";
  }

  if (approver) {
    try {
      await bindWebflowUserToTowerUser(approver, installerUserId);
    } catch (error) {
      // The token is stored; the link is re-attempted by the Designer exchange (install-time lookup).
      console.warn(
        `[tower/webflow-oauth] webflow identity link failed: ${error instanceof Error ? error.message : error}`
      );
    }
  }
  return "ok";
}
