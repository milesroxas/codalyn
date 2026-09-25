import { revokeWebflowAccessToken } from "@/server/webflow-oauth-exchange";
import {
  deleteOrganizationWebflowOAuthToken,
  listOrganizationWebflowTokens,
  type OrganizationWebflowAppToken,
} from "@/server/webflow-proxy-token";

export type RevokeWorkspaceWebflowTokensDeps = {
  list: (organizationIds: string[]) => Promise<OrganizationWebflowAppToken[]>;
  revoke: (accessToken: string, app: OrganizationWebflowAppToken["app"]) => Promise<boolean>;
  forget: (organizationId: string, app: OrganizationWebflowAppToken["app"]) => Promise<void>;
  warn: (message: string) => void;
};

const defaultDeps: RevokeWorkspaceWebflowTokensDeps = {
  list: listOrganizationWebflowTokens,
  revoke: (accessToken, app) => revokeWebflowAccessToken(accessToken, app),
  forget: (organizationId, app) => deleteOrganizationWebflowOAuthToken(organizationId, app),
  warn: (message) => console.warn(message),
};

/**
 * Workspace deletion: revoke every stored Webflow authorization at Webflow, then forget it locally (token
 * row + site links), before the organization rows go. Letting the rows cascade alone would leave the
 * authorization live in the customer's Webflow workspace with no holder — the gap
 * `DELETE /api/integrations/webflow/connection` closed for explicit disconnects (compliance doc R8.11;
 * Marketplace guidelines: "Users must be able to fully revoke your App's access"). Best-effort and never
 * throws: the deletion proceeds either way, so a Webflow outage cannot keep a token Tower no longer wants.
 */
export async function revokeAndForgetWorkspaceWebflowTokens(
  organizationIds: string[],
  overrides: Partial<RevokeWorkspaceWebflowTokensDeps> = {}
): Promise<{ revoked: number; unconfirmed: number }> {
  const deps = { ...defaultDeps, ...overrides };
  const result = { revoked: 0, unconfirmed: 0 };
  if (organizationIds.length === 0) {
    return result;
  }
  let tokens: OrganizationWebflowAppToken[];
  try {
    tokens = await deps.list(organizationIds);
  } catch (error) {
    deps.warn(`[tower/webflow-oauth] could not list Webflow tokens before workspace deletion: ${String(error)}`);
    return result;
  }
  for (const token of tokens) {
    let confirmed = false;
    try {
      confirmed = await deps.revoke(token.accessToken, token.app);
    } catch {
      confirmed = false;
    }
    if (confirmed) {
      result.revoked += 1;
    } else {
      result.unconfirmed += 1;
      deps.warn(
        `[tower/webflow-oauth] revoke_authorization did not confirm for org ${token.organizationId} (${token.app}) before workspace deletion`
      );
    }
    try {
      await deps.forget(token.organizationId, token.app);
    } catch (error) {
      deps.warn(
        `[tower/webflow-oauth] could not delete the stored token for org ${token.organizationId} (${token.app}): ${String(error)}`
      );
    }
  }
  return result;
}
