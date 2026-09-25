import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { decryptStoredSecret } from "@/server/security/secret-encryption";
import {
  normalizeWebflowAppKey,
  resolveWebflowAppClientCredentials,
  WEBFLOW_DATA_API_APP_KEY,
  type WebflowAppKey,
} from "@/server/webflow-app-registry";
import {
  listOrganizationIdsLinkedToWebflowSite,
  unlinkOrganizationWebflowSites,
} from "@/server/webflow-organization-sites";
import { db } from "@/shared/lib/db";
import { organizationWebflowOAuthToken } from "@/shared/lib/db/auth-schema";

export type ResolveWebflowBearerTokenOptions = {
  userId?: string;
  /** Prefer over Next `headers()` when handling an incoming Request (API routes, Route Handlers). */
  request?: Request;
  requestHeaders?: Headers;
  /** Which app's stored token to use. Data API features are Beacon; default Beacon. */
  app?: WebflowAppKey;
};

export type OrganizationWebflowToken = { organizationId: string; accessToken: string };

/**
 * Resolves the active workspace's stored OAuth token (with its `organizationId` so a revoked token can
 * be pruned). Webflow issues no refresh tokens, so a rejected token can only be cleared + reconnected.
 * @see https://developers.webflow.com/data/reference/authentication
 */
export async function resolveActiveOrganizationWebflowToken(
  options?: ResolveWebflowBearerTokenOptions
): Promise<OrganizationWebflowToken | undefined> {
  const hdrs = options?.request?.headers ?? options?.requestHeaders;
  let userId = options?.userId?.trim();
  if (!userId) {
    if (hdrs) {
      const session = await auth.api.getSession({ headers: hdrs });
      userId = session?.user?.id?.trim();
    }
    if (!userId) {
      const session = await auth.api.getSession({ headers: await headers() });
      userId = session?.user?.id?.trim();
    }
  }
  if (!userId) {
    return undefined;
  }

  const organizationId = hdrs
    ? await getActiveOrganizationIdForAuthHeaders(hdrs)
    : await getActiveOrganizationIdForAuthHeaders(await headers());
  if (!organizationId) {
    return undefined;
  }

  const app = options?.app ?? WEBFLOW_DATA_API_APP_KEY;
  const rows = await db
    .select({ accessToken: organizationWebflowOAuthToken.accessToken })
    .from(organizationWebflowOAuthToken)
    .where(
      and(
        eq(organizationWebflowOAuthToken.organizationId, organizationId),
        eq(organizationWebflowOAuthToken.appKey, app)
      )
    )
    .limit(1);
  const stored = rows[0]?.accessToken?.trim();
  if (!stored) {
    return undefined;
  }
  // Undecryptable (rotated key / tampered row) means unusable — same as no token: reconnect required.
  const accessToken = decryptStoredSecret(stored)?.trim();
  return accessToken ? { organizationId, accessToken } : undefined;
}

/**
 * Resolves the Bearer token for outbound Webflow Data API v2 calls (proxy, server jobs).
 * Uses the workspace (active organization) OAuth row; all members share the same stored token.
 */
export async function resolveWebflowBearerToken(
  options?: ResolveWebflowBearerTokenOptions
): Promise<string | undefined> {
  return (await resolveActiveOrganizationWebflowToken(options))?.accessToken;
}

/**
 * Stored OAuth tokens (one app) for the organizations whose token is known to reach `siteId` — the
 * site a Designer ID token was issued on. This is the only tenant-token lookup the unauthenticated
 * ID-token exchange may perform: it never tries tokens of tenants unrelated to the caller's site.
 * Empty when the site is unknown (never linked, or its org's token was pruned).
 */
export async function listOrganizationWebflowTokensForSite(
  siteId: string,
  app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY
): Promise<OrganizationWebflowToken[]> {
  const orgIds = await listOrganizationIdsLinkedToWebflowSite(siteId, app);
  if (orgIds.length === 0) {
    return [];
  }
  const rows = await db
    .select({
      organizationId: organizationWebflowOAuthToken.organizationId,
      accessToken: organizationWebflowOAuthToken.accessToken,
    })
    .from(organizationWebflowOAuthToken)
    .where(
      and(inArray(organizationWebflowOAuthToken.organizationId, orgIds), eq(organizationWebflowOAuthToken.appKey, app))
    );
  return rows
    .map((r) => {
      const stored = r.accessToken?.trim() ?? "";
      const accessToken = stored ? (decryptStoredSecret(stored)?.trim() ?? "") : "";
      return { organizationId: r.organizationId, accessToken };
    })
    .filter((r) => r.accessToken.length > 0);
}

export type OrganizationWebflowAppToken = OrganizationWebflowToken & { app: WebflowAppKey };

/**
 * Every stored Webflow OAuth token, for every app, of the given organizations — decrypted, so the
 * authorization can be revoked at Webflow before the rows go (workspace deletion, compliance doc R8.22).
 * Undecryptable rows are skipped: there is nothing usable to revoke.
 */
export async function listOrganizationWebflowTokens(organizationIds: string[]): Promise<OrganizationWebflowAppToken[]> {
  if (organizationIds.length === 0) {
    return [];
  }
  const rows = await db
    .select({
      organizationId: organizationWebflowOAuthToken.organizationId,
      appKey: organizationWebflowOAuthToken.appKey,
      accessToken: organizationWebflowOAuthToken.accessToken,
    })
    .from(organizationWebflowOAuthToken)
    .where(inArray(organizationWebflowOAuthToken.organizationId, organizationIds));
  return rows
    .map((r) => {
      const stored = r.accessToken?.trim() ?? "";
      const accessToken = stored ? (decryptStoredSecret(stored)?.trim() ?? "") : "";
      return { organizationId: r.organizationId, app: normalizeWebflowAppKey(r.appKey), accessToken };
    })
    .filter((r) => r.accessToken.length > 0);
}

/**
 * Removes a workspace's stored Webflow OAuth token for one app. Used when Webflow rejects it
 * (revoked/app uninstalled): there is no refresh token to recover with, so the org must reconnect.
 */
export async function deleteOrganizationWebflowOAuthToken(
  organizationId: string,
  app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY
): Promise<void> {
  await db
    .delete(organizationWebflowOAuthToken)
    .where(
      and(
        eq(organizationWebflowOAuthToken.organizationId, organizationId),
        eq(organizationWebflowOAuthToken.appKey, app)
      )
    );
  await unlinkOrganizationWebflowSites(organizationId, app);
}

/** OAuth app credentials (authorization code flow) for an app; used to obtain an OAuth access token, not as the Data API Bearer. */
export function hasWebflowOAuthCredentials(app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY): boolean {
  const { clientId, clientSecret } = resolveWebflowAppClientCredentials(app);
  return Boolean(clientId && clientSecret);
}
