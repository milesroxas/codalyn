import { webflowDataApiUrl } from "@codalyn/webflow-kit";
import { and, eq } from "drizzle-orm";
import { WEBFLOW_DATA_API_APP_KEY, type WebflowAppKey } from "@/server/webflow-app-registry";
import { db } from "@/shared/lib/db";
import { organizationWebflowSite } from "@/shared/lib/db/auth-schema";

/** Bounded so site discovery never pins the OAuth callback open on a slow upstream. */
const LIST_SITES_TIMEOUT_MS = 10_000;

/** Webflow site ids are 24-hex ObjectIds; anything else is not a site id we would ever look up. */
const WEBFLOW_SITE_ID_PATTERN = /^[0-9a-f]{24}$/i;

export function isWebflowSiteId(raw: unknown): raw is string {
  return typeof raw === "string" && WEBFLOW_SITE_ID_PATTERN.test(raw);
}

/** Site ids from a `GET /v2/sites` payload (`{ sites: [{ id }] }`); malformed entries are skipped. */
export function readWebflowSiteIds(raw: unknown): string[] {
  if (raw === null || typeof raw !== "object") {
    return [];
  }
  const list = (raw as { sites?: unknown }).sites;
  if (!Array.isArray(list)) {
    return [];
  }
  const out = new Set<string>();
  for (const entry of list) {
    const id = entry && typeof entry === "object" ? (entry as { id?: unknown }).id : undefined;
    if (isWebflowSiteId(id)) {
      out.add(id);
    }
  }
  return [...out];
}

/** Records that `organizationId`'s stored token for `app` can reach `siteId` (idempotent). */
export async function linkOrganizationWebflowSites(
  organizationId: string,
  siteIds: readonly string[],
  app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY
): Promise<void> {
  const valid = siteIds.filter(isWebflowSiteId);
  if (valid.length === 0) {
    return;
  }
  await db
    .insert(organizationWebflowSite)
    .values(valid.map((siteId) => ({ organizationId, appKey: app, siteId })))
    .onConflictDoNothing();
}

/** Forgets every site link for one org + app (called when its token is pruned or replaced). */
export async function unlinkOrganizationWebflowSites(
  organizationId: string,
  app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY
): Promise<void> {
  await db
    .delete(organizationWebflowSite)
    .where(and(eq(organizationWebflowSite.organizationId, organizationId), eq(organizationWebflowSite.appKey, app)));
}

/** Organizations whose stored `app` token is known to reach `siteId` (bounded; normally 0–1 rows). */
export async function listOrganizationIdsLinkedToWebflowSite(
  siteId: string,
  app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY,
  limit = 5
): Promise<string[]> {
  if (!isWebflowSiteId(siteId)) {
    return [];
  }
  const rows = await db
    .select({ organizationId: organizationWebflowSite.organizationId })
    .from(organizationWebflowSite)
    .where(and(eq(organizationWebflowSite.appKey, app), eq(organizationWebflowSite.siteId, siteId)))
    .limit(limit);
  return rows.map((r) => r.organizationId);
}

/**
 * Discovers the sites a fresh OAuth token can reach (`GET /v2/sites`, scope `sites:read`) and links
 * them to the org. Best-effort: a failure here must never fail the OAuth completion — the proxy
 * refreshes links opportunistically on later authenticated `GET sites/{id}` reads.
 */
export async function syncOrganizationWebflowSitesFromToken(
  organizationId: string,
  accessToken: string,
  app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  try {
    const res = await fetchImpl(webflowDataApiUrl(["sites"]), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(LIST_SITES_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[tower/webflow-oauth] GET sites for site linking failed: ${res.status}`);
      return;
    }
    // Replace, don't merge: a reconnect may be for a different Webflow workspace than before.
    await unlinkOrganizationWebflowSites(organizationId, app);
    await linkOrganizationWebflowSites(organizationId, readWebflowSiteIds(await res.json()), app);
  } catch (error) {
    console.warn(`[tower/webflow-oauth] site linking error: ${error instanceof Error ? error.message : error}`);
  }
}
