import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { db } from "@/shared/lib/db";
import { organizationWebflowOAuthToken } from "@/shared/lib/db/auth-schema";

export type ResolveWebflowBearerTokenOptions = {
  userId?: string;
  /** Prefer over Next `headers()` when handling an incoming Request (API routes, Route Handlers). */
  request?: Request;
  requestHeaders?: Headers;
};

/**
 * Resolves the Bearer token for outbound Webflow Data API v2 calls (proxy, server jobs).
 * Uses the workspace (active organization) OAuth row; all members share the same stored token.
 * @see https://developers.webflow.com/data/reference/authentication
 */
export async function resolveWebflowBearerToken(
  options?: ResolveWebflowBearerTokenOptions
): Promise<string | undefined> {
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

  const rows = await db
    .select({ accessToken: organizationWebflowOAuthToken.accessToken })
    .from(organizationWebflowOAuthToken)
    .where(eq(organizationWebflowOAuthToken.organizationId, organizationId))
    .limit(1);
  const stored = rows[0]?.accessToken?.trim();
  return stored || undefined;
}

/** Any workspace OAuth token (for Designer ID-token resolve when the extension has no Tower session cookie). */
export async function pickAnyOrganizationWebflowAccessToken(): Promise<string | undefined> {
  const rows = await db
    .select({ accessToken: organizationWebflowOAuthToken.accessToken })
    .from(organizationWebflowOAuthToken)
    .limit(1);
  return rows[0]?.accessToken?.trim() || undefined;
}

/** OAuth app credentials (authorization code flow); used to obtain an OAuth access token, not as the Data API Bearer. */
export function hasWebflowOAuthCredentials(): boolean {
  return Boolean(process.env.WEBFLOW_CLIENT_ID?.trim() && process.env.WEBFLOW_CLIENT_SECRET?.trim());
}
