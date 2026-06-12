import type { WebflowOAuthTokenResponse } from "@/server/webflow-oauth-exchange";
import { db } from "@/shared/lib/db";
import { organizationWebflowOAuthToken } from "@/shared/lib/db/auth-schema";

/**
 * Persists Webflow OAuth access (and optional refresh) token server-side on the workspace (`organizationId`) only.
 * Matches the Data Client flow: exchange `code` for tokens, store in your app DB — never ship the access token to the client.
 * @see https://developers.webflow.com/apps/docs/data-clients/build-a-data-client#oauth-authentication
 */
export async function persistOrganizationWebflowOAuthToken(
  organizationId: string,
  tokenResponse: WebflowOAuthTokenResponse
): Promise<void> {
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
