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
