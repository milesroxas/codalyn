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

/**
 * Opens a public Codalyn page in a new tab. Must be called from a user gesture (Designer popup
 * blocking), and only accepts the constants above — the extension never navigates to a URL it did not
 * author, which is the same allowlist discipline the auth popups follow.
 */
export function openCodalynPolicyPage(url: CodalynPublicPageUrl): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
