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
export async function persistOrganizationWebflowOAuthToken(
  organizationId: string,
  tokenResponse: WebflowOAuthTokenResponse,
  appKey: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY
): Promise<void> {
  const expiresIn = tokenResponse.expires_in;
  const expiresAt =
    typeof expiresIn === "number" && Number.isFinite(expiresIn) ? new Date(Date.now() + expiresIn * 1000) : null;

  const accessToken = encryptStoredSecret(tokenResponse.access_token);
  const refreshToken = tokenResponse.refresh_token ? encryptStoredSecret(tokenResponse.refresh_token) : null;

  await db
    .insert(organizationWebflowOAuthToken)
    .values({
      organizationId,
      appKey,
      accessToken,
      refreshToken,
      expiresAt,
      scope: tokenResponse.scope ?? null,
    })
    .onConflictDoUpdate({
      target: [organizationWebflowOAuthToken.organizationId, organizationWebflowOAuthToken.appKey],
      set: {
        accessToken,
        refreshToken,
        expiresAt,
        scope: tokenResponse.scope ?? null,
        updatedAt: new Date(),
      },
    });

  // Record which sites this token reaches so the Designer ID-token exchange can pick *this* org's token
  // for an ID token issued on one of them (instead of trying other tenants' tokens). Best-effort.
  await syncOrganizationWebflowSitesFromToken(organizationId, tokenResponse.access_token, appKey);
}
