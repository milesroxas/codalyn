/**
 * The Data API surface Tower's `/api/v2/webflow/*` proxy will forward on a workspace's behalf.
 *
 * The proxy attaches the workspace's OAuth token to whatever the caller asks for, so without this
 * list any signed-in workspace member — including editor-experience users — could reach every
 * endpoint the token's scopes admit (publish the site, delete a collection, rewrite site-level
 * custom code) through Beacon's session. Marketplace guidelines, "Data integrity": gate every write
 * and delete operation behind authenticated, verified triggers. The list is exactly the set of
 * calls the Beacon extension makes (apps/beacon/src, every `/api/v2/webflow/…` site, audited
 * 2026-09-18); anything else is refused before the upstream request is built. Adding a Data API
 * call to Beacon means adding its method + path here, with the scope that call needs already in
 * `BEACON_SCOPES` (authorize route).
 *
 * Ids are matched loosely (one whole path segment) — this gates *which endpoints* exist, not id
 * formats; Webflow validates the ids and the token's site access. Matching is segment-by-segment,
 * never on a joined string, so a segment that itself contains a slash cannot impersonate a deeper
 * path.
 */

const ID_SEGMENT = /^[A-Za-z0-9_-]+$/;

type ProxyMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ProxyRule = { method: ProxyMethod; segments: readonly string[] };

function rule(method: ProxyMethod, template: string): ProxyRule {
  return { method, segments: template.split("/") };
}

function segmentMatches(expected: string, actual: string): boolean {
  return expected === ":id" ? ID_SEGMENT.test(actual) : expected === actual;
}

function ruleMatches(entry: ProxyRule, method: string, segments: readonly string[]): boolean {
  return (
    entry.method === method &&
    entry.segments.length === segments.length &&
    entry.segments.every((expected, index) => segmentMatches(expected, segments[index] ?? ""))
  );
}

/** One entry per Beacon call site; keep the comments pointing at the feature that needs it. */
export const WEBFLOW_PROXY_ALLOWED_REQUESTS: readonly ProxyRule[] = [
  // Site + locales (webflow-cms-write-locale.ts), collections list (cms-slot-link-targets-data.ts)
  rule("GET", "sites/:id"),
  rule("GET", "sites/:id/collections"),
  // CMS Slots page runtime install: page + site custom code, hosted runtime registration, assets
  rule("GET", "sites/:id/pages"),
  rule("GET", "sites/:id/custom_code"),
  rule("GET", "sites/:id/registered_scripts"),
  rule("POST", "sites/:id/registered_scripts/hosted"),
  rule("GET", "sites/:id/assets"),
  rule("POST", "sites/:id/assets"),
  rule("DELETE", "assets/:id"),
  rule("GET", "pages/:id/custom_code"),
  rule("PUT", "pages/:id/custom_code"),
  // CMS Slots composer + list-target text binding, image editor CMS image field
  rule("GET", "collections/:id"),
  rule("POST", "collections/:id/fields"),
  rule("DELETE", "collections/:id/fields/:id"),
  rule("GET", "collections/:id/items"),
  rule("PATCH", "collections/:id/items"),
  rule("PATCH", "collections/:id/items/live"),
  rule("GET", "collections/:id/items/:id"),
  rule("GET", "collections/:id/items/:id/live"),
  rule("PATCH", "collections/:id/items/:id/live"),
];

/** True when the proxy may forward `method` for these already-validated path segments. */
export function isAllowedWebflowProxyRequest(method: string, segments: readonly string[]): boolean {
  const upper = method.toUpperCase();
  return WEBFLOW_PROXY_ALLOWED_REQUESTS.some((entry) => ruleMatches(entry, upper, segments));
}
