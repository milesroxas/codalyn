/**
 * Public Codalyn policy pages, linked from in-app disclosures. These are fixed production URLs rather than
 * build-origin-relative ones: the published policies live on production Tower regardless of which channel a
 * bundle was built for, and Marketplace review expects the disclosure in the app to reach the same policy
 * text the listing points at.
 */
export const CODALYN_PRIVACY_POLICY_URL = "https://tower.codalyn.app/privacy";
export const CODALYN_TERMS_URL = "https://tower.codalyn.app/terms";
/** Public Beacon documentation (setup, CMS Slots, custom-code removal). */
export const CODALYN_BEACON_DOCS_URL = "https://tower.codalyn.app/docs";

export type CodalynPublicPageUrl =
  | typeof CODALYN_PRIVACY_POLICY_URL
  | typeof CODALYN_TERMS_URL
  | typeof CODALYN_BEACON_DOCS_URL;

/** `rel` for every external link the extension renders: no opener handle, no referrer leak. */
export const CODALYN_EXTERNAL_LINK_REL = "noopener noreferrer";

export type CodalynPolicyLinkProps = {
  href: CodalynPublicPageUrl;
  target: "_blank";
  rel: typeof CODALYN_EXTERNAL_LINK_REL;
};

/**
 * Anchor props for a public Codalyn page. Rendered as a plain `<a target="_blank">` (via `Button asChild`
 * / `DropdownMenuItem asChild`) rather than `window.open`: the browser handles the navigation as an ordinary
 * user-initiated link, the extension holds no handle to the opened document, and no script-spawned window
 * exists for App Review Preflight's "Prohibited Popups" rule to flag. Only accepts the constants above — the
 * extension never navigates to a URL it did not author.
 */
export function codalynPolicyLinkProps(url: CodalynPublicPageUrl): CodalynPolicyLinkProps {
  return { href: url, target: "_blank", rel: CODALYN_EXTERNAL_LINK_REL };
}
