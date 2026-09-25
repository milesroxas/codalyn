import { parseWebflowSiteSummaries, type WebflowSiteSummary, webflowDataApiUrl } from "@codalyn/webflow-kit";
import {
  deleteOrganizationWebflowOAuthToken,
  resolveActiveOrganizationWebflowToken,
} from "@/server/webflow-proxy-token";
import { isWebflowUpstreamRevocation } from "@/server/webflow-upstream-revocation";

export type { WebflowSiteSummary };

type WebflowSitesFetch = { status: number; ok: boolean; sites: WebflowSiteSummary[] };

async function fetchWebflowSites(accessToken: string): Promise<WebflowSitesFetch> {
  const token = accessToken.trim();
  if (!token) {
    return { status: 0, ok: false, sites: [] };
  }

  const url = webflowDataApiUrl(["sites"]);
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    return { status: res.status, ok: false, sites: [] };
  }

  const json: unknown = await res.json();
  return { status: res.status, ok: true, sites: parseWebflowSiteSummaries(json) };
}

/**
 * Sites the active workspace's stored token can reach; `null` when the workspace holds no usable token.
 *
 * Runs on every Beacon settings pull and dashboard render, so it is also where a token revoked on the
 * Webflow side (App uninstalled, access revoked) is found first: Webflow sends no uninstall webhook, and
 * without this the dead row would linger until the workspace's next Data API write. A 401 deletes the
 * stored token and site links and reports "no connection" (Marketplace guidelines: "When a token is
 * revoked, your App must stop making API calls with it and delete it from storage"; compliance doc R8.22).
 * An explicitly passed `accessToken` (fresh from the OAuth callback) is used as is and never pruned.
 */
export async function listWebflowSitesForUser(opts: {
  userId: string;
  requestHeaders: Headers;
  accessToken?: string;
}): Promise<WebflowSiteSummary[] | null> {
  const explicit = opts.accessToken?.trim();
  if (explicit) {
    return (await fetchWebflowSites(explicit)).sites;
  }

  const stored = await resolveActiveOrganizationWebflowToken({
    userId: opts.userId,
    requestHeaders: opts.requestHeaders,
  });
  if (!stored) {
    return null;
  }

  const result = await fetchWebflowSites(stored.accessToken);
  if (!result.ok && isWebflowUpstreamRevocation(result.status)) {
    await deleteOrganizationWebflowOAuthToken(stored.organizationId);
    console.warn(
      `[tower/webflow] pruned revoked Webflow token for org ${stored.organizationId} while listing sites; reconnect required`
    );
    return null;
  }
  return result.sites;
}
