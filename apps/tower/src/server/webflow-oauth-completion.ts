import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import { classifyWebflowOAuthCallback } from "@/server/webflow-oauth-callback-logic";
import { WEBFLOW_OAUTH_FINISH_PATH } from "@/server/webflow-oauth-config";
import {
  exchangeWebflowAuthorizationCode,
  revokeWebflowAccessToken,
  type WebflowOAuthTokenResponse,
} from "@/server/webflow-oauth-exchange";
import {
  consumeStagedWebflowInstallAuthorizationCode,
  stageWebflowInstallAuthorizationCode,
} from "@/server/webflow-oauth-install-pending";
import { persistOrganizationWebflowOAuthToken } from "@/server/webflow-oauth-persist";

export type WebflowOAuthCompletionError =
  | "pending_expired"
  | "token_exchange"
  | "token_storage"
  | "team_admin_required"
  | "no_active_workspace"
  | "unauthorized";

export type WebflowOAuthCompletionResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: WebflowOAuthCompletionError };

export async function completeWebflowOAuthForOrganization(input: {
  organizationId: string;
  authorizationCode: string;
  redirectUri: string;
}): Promise<WebflowOAuthCompletionResult> {
  let tokenResponse: WebflowOAuthTokenResponse;
  try {
    tokenResponse = await exchangeWebflowAuthorizationCode(input.authorizationCode, input.redirectUri);
  } catch {
    return { ok: false, error: "token_exchange" };
  }

  try {
    await persistOrganizationWebflowOAuthToken(input.organizationId, tokenResponse);
  } catch (error) {
    // e.g. MissingSecretEncryptionKeyError in production — the token is never stored in plaintext.
    console.error(`[tower/webflow-oauth] token storage failed: ${error instanceof Error ? error.message : error}`);
    await revokeWebflowAccessToken(tokenResponse.access_token);
    return { ok: false, error: "token_storage" };
  }
  return { ok: true, organizationId: input.organizationId };
}

export async function finishStagedWebflowInstallOAuth(
  request: Request,
  pendingId: string
): Promise<WebflowOAuthCompletionResult> {
  const session = await auth.api.getSession({ headers: request.headers });
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    return { ok: false, error: "unauthorized" };
  }

  const activeOrganizationId = await getActiveOrganizationIdForAuthHeaders(request.headers);
  if (!activeOrganizationId) {
    return { ok: false, error: "no_active_workspace" };
  }

  const admin = await isTowerTeamAdminMemberOfOrg(sessionUserId, activeOrganizationId);
  if (!admin) {
    return { ok: false, error: "team_admin_required" };
  }

  const staged = await consumeStagedWebflowInstallAuthorizationCode(pendingId);
  if (!staged) {
    return { ok: false, error: "pending_expired" };
  }

  return completeWebflowOAuthForOrganization({
    organizationId: activeOrganizationId,
    authorizationCode: staged.authorizationCode,
    redirectUri: staged.redirectUri,
  });
}

export function buildWebflowOAuthFinishSignInUrl(appUrl: string): string {
  return `${appUrl}/sign-in?callbackUrl=${encodeURIComponent(WEBFLOW_OAUTH_FINISH_PATH)}`;
}

export async function stageWebflowInitiatedInstallFromCallback(input: {
  authorizationCode: string;
  redirectUri: string;
  externalState: string | null;
}): Promise<string> {
  return stageWebflowInstallAuthorizationCode(input);
}

export function readWebflowOAuthCallbackQuery(searchParams: URLSearchParams): {
  code: string | null;
  state: string | null;
  oauthError: string | null;
  oauthErrorDescription: string | null;
} {
  return {
    code: searchParams.get("code"),
    state: searchParams.get("state"),
    oauthError: searchParams.get("error"),
    oauthErrorDescription: searchParams.get("error_description"),
  };
}

export function resolveWebflowOAuthCallbackKind(
  searchParams: URLSearchParams,
  cookieExpectedState: string | undefined
) {
  const query = readWebflowOAuthCallbackQuery(searchParams);
  return {
    query,
    kind: classifyWebflowOAuthCallback({
      ...query,
      cookieExpectedState,
    }),
  };
}
