import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { db } from "@/shared/lib/db";
import { webflowOAuthToken } from "@/shared/lib/db/auth-schema";

/**
 * Resolves the Bearer token for outbound Webflow Data API v2 calls (proxy, server jobs).
 * Only the stored OAuth access token for the Tower user (`userId` from API auth or session).
 * @see https://developers.webflow.com/data/reference/authentication
 */
export async function resolveWebflowBearerToken(options?: { userId?: string }): Promise<string | undefined> {
  let userId = options?.userId?.trim();
  if (!userId) {
    const session = await auth.api.getSession({ headers: await headers() });
    userId = session?.user?.id?.trim();
  }
  if (!userId) {
    return undefined;
  }

  const rows = await db
    .select({ accessToken: webflowOAuthToken.accessToken })
    .from(webflowOAuthToken)
    .where(eq(webflowOAuthToken.userId, userId))
    .limit(1);
  const stored = rows[0]?.accessToken?.trim();
  return stored || undefined;
}

/** OAuth app credentials (authorization code flow); used to obtain an OAuth access token, not as the Data API Bearer. */
export function hasWebflowOAuthCredentials(): boolean {
  return Boolean(process.env.WEBFLOW_CLIENT_ID?.trim() && process.env.WEBFLOW_CLIENT_SECRET?.trim());
}
