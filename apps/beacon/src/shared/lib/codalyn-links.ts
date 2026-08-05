/**
 * Public Codalyn policy pages, linked from in-app disclosures. These are fixed production URLs rather than
 * build-origin-relative ones: the published policies live on production Tower regardless of which channel a
 * bundle was built for, and Marketplace review expects the disclosure in the app to reach the same policy
 * text the listing points at.
 */
export const CODALYN_PRIVACY_POLICY_URL = "https://tower.codalyn.app/privacy";
export const CODALYN_TERMS_URL = "https://tower.codalyn.app/terms";

/**
 * Opens a public Codalyn policy page in a new tab. Must be called from a user gesture (Designer popup
 * blocking), and only accepts the constants above — the extension never navigates to a URL it did not
 * author, which is the same allowlist discipline the auth popups follow.
 */
export function openCodalynPolicyPage(url: typeof CODALYN_PRIVACY_POLICY_URL | typeof CODALYN_TERMS_URL): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
