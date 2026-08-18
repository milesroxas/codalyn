import { deleteOrganizationWebflowOAuthToken, type OrganizationWebflowToken } from "@/server/webflow-proxy-token";

export const WEBFLOW_TOKEN_REVOKED_ERROR = "webflow_token_revoked";
export const WEBFLOW_TOKEN_REVOKED_CODE = "WEBFLOW_TOKEN_REVOKED";
export const WEBFLOW_TOKEN_REVOKED_HINT =
  "Webflow no longer accepts this workspace's connection. Reconnect Webflow in Tower to continue.";

/** Webflow 401 = the bearer itself is invalid/revoked. 403 is a scope/permission failure, not revocation. */
export function isWebflowUpstreamRevocation(status: number): boolean {
  return status === 401;
}

/** The response every Tower route returns once a stored token is found revoked; stable code for the extension. */
export function webflowTokenRevokedResponse(): Response {
  return Response.json(
    { error: WEBFLOW_TOKEN_REVOKED_ERROR, code: WEBFLOW_TOKEN_REVOKED_CODE, hint: WEBFLOW_TOKEN_REVOKED_HINT },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * When Webflow rejected the stored workspace token, prunes it (Webflow issues no refresh token, so the
 * row can only be cleared + reconnected) and returns the reconnect response. Null when the upstream
 * status is anything else, so callers keep their normal error mapping.
 */
export async function handleWebflowUpstreamRevocation(
  upstream: Response,
  stored: OrganizationWebflowToken
): Promise<Response | null> {
  if (!isWebflowUpstreamRevocation(upstream.status)) {
    return null;
  }
  await deleteOrganizationWebflowOAuthToken(stored.organizationId);
  console.warn(`[tower/webflow] pruned revoked Webflow token for org ${stored.organizationId}; reconnect required`);
  return webflowTokenRevokedResponse();
}
