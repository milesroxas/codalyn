/**
 * Where Webflow hosts a site asset once the create-asset upload completes: the `hostedUrl` (the
 * reference also documents `assetUrl`) returned by `POST /v2/sites/{site_id}/assets`, always an
 * absolute HTTPS URL on Webflow's own asset CDN (`https://cdn.prod.website-files.com/<site>/<id>_<name>`).
 *
 * The CMS Slots runtime is registered as a *hosted* script from exactly that URL, and the page tag
 * customers' visitors load points at it with the SHA-256 SRI of the uploaded bytes. So the URL is a
 * boundary value: it is validated here — HTTPS, a Webflow asset host, no URL credentials, no
 * non-default port, no whitespace — before it is registered, before it is written into the runtime's
 * source-map trailer, and before an existing asset is reused (Marketplace guidelines, "Recommended
 * practices for published-site code": reference injected scripts at immutable, versioned HTTPS URLs;
 * review round 9, 2026-09-28: validate the destination against the expected HTTPS Webflow asset origins
 * and reject credentials or non-default ports before registration).
 *
 * Dependency-free on purpose (shared by the install flow and its tests).
 * @see https://developers.webflow.com/data/reference/assets/assets/create
 * @see https://developers.webflow.com/data/reference/custom-code/custom-code/register-hosted
 */

/** Registrable hosts: `website-files.com` and any subdomain of it, or any subdomain of `webflow.com`. */
function isWebflowHostedAssetHost(hostname: string): boolean {
  return (
    hostname === "website-files.com" || hostname.endsWith(".website-files.com") || hostname.endsWith(".webflow.com")
  );
}

/**
 * True only for an absolute `https:` URL on a Webflow asset host with no username, password or explicit
 * non-default port and no whitespace anywhere in the raw value. Anything else — another host, `http:`,
 * `user:pass@`, `:8443`, a relative path, a non-string — is not a destination the runtime may be served from.
 */
export function isWebflowHostedAssetUrl(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length === 0 || /\s/.test(raw)) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "") {
    return false;
  }
  return isWebflowHostedAssetHost(url.hostname);
}

/**
 * Boundary reader for the create-asset response's hosted location: the value as Webflow returned it when
 * it passes {@link isWebflowHostedAssetUrl}, else `null` — never a partially accepted or rewritten URL.
 */
export function readWebflowHostedAssetUrl(raw: unknown): string | null {
  return isWebflowHostedAssetUrl(raw) ? raw : null;
}
