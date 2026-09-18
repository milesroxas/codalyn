/**
 * The one S3 bucket Webflow's create-asset endpoint hands out as `uploadUrl`, in the two URL syntaxes
 * S3 has for the same bucket:
 *
 * - virtual-hosted, `https://webflow-prod-assets.s3.amazonaws.com/` — what production returns
 *   (observed 2026-09-17, first Sync after review round 8; the object key travels in `uploadDetails`);
 * - path-style, `https://s3.amazonaws.com/webflow-prod-assets` — what the create-asset reference shows.
 *
 * Pinned exactly and shared by the egress policy (source-level control) and the shipped CSP
 * `connect-src` (browser-enforced control) so the two cannot drift. Any other bucket in either syntax,
 * regional endpoints and lookalike hosts are refused. A bucket or host change on Webflow's side fails
 * closed with a visible install error rather than widening either policy — the new value ships through
 * an App Update. Lesson from review round 8: pin what an observed response carries, not a docs example.
 *
 * Dependency-free on purpose: vite.config.ts imports the CSP builder at build time.
 * @see https://developers.webflow.com/data/reference/assets/assets/create
 */
export const WEBFLOW_ASSET_UPLOAD_HOST = "s3.amazonaws.com";
export const WEBFLOW_ASSET_UPLOAD_BUCKET = "webflow-prod-assets";
/** The bucket as a virtual-hosted S3 host — the form production `uploadUrl` values use. */
export const WEBFLOW_ASSET_UPLOAD_BUCKET_HOST = `${WEBFLOW_ASSET_UPLOAD_BUCKET}.${WEBFLOW_ASSET_UPLOAD_HOST}`;

/**
 * `connect-src` sources for that bucket — never the bare S3 host, which would admit every bucket.
 * The virtual-hosted entry is a host whose name *is* the bucket (any path on it is a key in that
 * bucket). The path-style pair uses CSP's path-part: without a trailing slash it must equal the
 * request path exactly (`/webflow-prod-assets`, the documented `uploadUrl`), with one it is a prefix
 * (a keyed URL in the same bucket). Path matching is only skipped after a redirect, and
 * `extensionFetch` refuses redirects (redirect mode error), so the path-part is always enforced.
 */
export const WEBFLOW_ASSET_UPLOAD_CSP_SOURCES = [
  `https://${WEBFLOW_ASSET_UPLOAD_BUCKET_HOST}`,
  `https://${WEBFLOW_ASSET_UPLOAD_HOST}/${WEBFLOW_ASSET_UPLOAD_BUCKET}`,
  `https://${WEBFLOW_ASSET_UPLOAD_HOST}/${WEBFLOW_ASSET_UPLOAD_BUCKET}/`,
] as const;
