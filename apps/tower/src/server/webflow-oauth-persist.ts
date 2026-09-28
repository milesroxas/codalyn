import { encryptStoredSecret } from "@/server/security/secret-encryption";
import { WEBFLOW_DATA_API_APP_KEY, type WebflowAppKey } from "@/server/webflow-app-registry";
import type { WebflowOAuthTokenResponse } from "@/server/webflow-oauth-exchange";
import { syncOrganizationWebflowSitesFromToken } from "@/server/webflow-organization-sites";
import { db } from "@/shared/lib/db";
import { organizationWebflowOAuthToken } from "@/shared/lib/db/auth-schema";

/**
 * Persists a Webflow OAuth access (and optional refresh) token server-side on the workspace
 * (`organizationId`) for one app (`appKey`). Beacon and Flint tokens coexist per workspace.
 * Matches the Data Client flow: exchange `code` for tokens, store in your app DB — never ship the access token to the client.
 * @see https://developers.webflow.com/apps/docs/data-clients/build-a-data-client#oauth-authentication
 */
/**
 * Who authorized the token: the approving Webflow user (`GET /v2/token/authorized_by`) and the Tower
 * account whose session completed the OAuth. Recorded so the Designer ID-token exchange can land the
 * approving Webflow user in that account (review round 9). Unknown values are stored as null, never guessed.
 */
export type WebflowOAuthTokenIdentity = {
  webflowAuthorizedUserId: string | null;
  authorizedByUserId: string | null;
};

export async function persistOrganizationWebflowOAuthToken(
  organizationId: string,
  tokenResponse: WebflowOAuthTokenResponse,
  appKey: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY,
  identity: WebflowOAuthTokenIdentity = { webflowAuthorizedUserId: null, authorizedByUserId: null }
): Promise<void> {
  const expiresIn = tokenResponse.expires_in;
  const expiresAt =
    typeof expiresIn === "number" && Number.isFinite(expiresIn) ? new Date(Date.now() + expiresIn * 1000) : null;

  const accessToken = encryptStoredSecret(tokenResponse.access_token);
  const refreshToken = tokenResponse.refresh_token ? encryptStoredSecret(tokenResponse.refresh_token) : null;
  const webflowAuthorizedUserId = identity.webflowAuthorizedUserId?.trim() || null;
  const authorizedByUserId = identity.authorizedByUserId?.trim() || null;

  await db
    .insert(organizationWebflowOAuthToken)
    .values({
      organizationId,
      appKey,
      accessToken,
      refreshToken,
      expiresAt,
      scope: tokenResponse.scope ?? null,
      webflowAuthorizedUserId,
      authorizedByUserId,
    })
    .onConflictDoUpdate({
      target: [organizationWebflowOAuthToken.organizationId, organizationWebflowOAuthToken.appKey],
      set: {
        accessToken,
        refreshToken,
        expiresAt,
        scope: tokenResponse.scope ?? null,
        // A reconnect is a new authorization: its approver replaces the old one (null when unknown).
        webflowAuthorizedUserId,
        authorizedByUserId,
        updatedAt: new Date(),
      },
    });

  // Record which sites this token reaches so the Designer ID-token exchange can pick *this* org's token
  // for an ID token issued on one of them (instead of trying other tenants' tokens). Best-effort.
  await syncOrganizationWebflowSitesFromToken(organizationId, tokenResponse.access_token, appKey);
}
