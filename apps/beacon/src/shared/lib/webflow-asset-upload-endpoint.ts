/**
 * The one host and bucket Webflow's create-asset endpoint documents for `uploadUrl`
 * (`https://s3.amazonaws.com/webflow-prod-assets/…`, path-style; observed on every CMS Slots install
 * since review round 3). Pinned exactly and shared by the egress policy (source-level control) and
 * the shipped CSP `connect-src` (browser-enforced control) so the two cannot drift. A bucket or host
 * change on Webflow's side fails closed with a visible install error rather than widening either
 * policy — the new value ships through an App Update.
 *
 * Dependency-free on purpose: vite.config.ts imports the CSP builder at build time.
 * @see https://developers.webflow.com/data/reference/assets/assets/create
 */
export const WEBFLOW_ASSET_UPLOAD_HOST = "s3.amazonaws.com";
export const WEBFLOW_ASSET_UPLOAD_BUCKET = "webflow-prod-assets";

/**
 * `connect-src` sources for that endpoint — the bucket path, not the bare host. A CSP source
 * expression carries a path-part: without a trailing slash it must equal the request path exactly,
 * with one it is a prefix. The first entry is the documented `uploadUrl` itself
 * (`https://s3.amazonaws.com/webflow-prod-assets`; the object key travels in `uploadDetails`), the
 * second admits the same bucket should Webflow ever return a keyed URL. Any other bucket on the host
 * is blocked by the browser. Path matching is only skipped after a redirect, and `extensionFetch`
 * refuses redirects (redirect mode error), so the path-part is always enforced.
 */
export const WEBFLOW_ASSET_UPLOAD_CSP_SOURCES = [
  `https://${WEBFLOW_ASSET_UPLOAD_HOST}/${WEBFLOW_ASSET_UPLOAD_BUCKET}`,
  `https://${WEBFLOW_ASSET_UPLOAD_HOST}/${WEBFLOW_ASSET_UPLOAD_BUCKET}/`,
] as const;
