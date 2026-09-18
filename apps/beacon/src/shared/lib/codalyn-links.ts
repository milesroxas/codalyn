import { readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";

/**
 * Public Codalyn pages linked from in-app disclosures, as paths on the Tower origin the bundle was built for
 * (`https://tower.codalyn.app` in a release build — the same policy text the Marketplace listing points at).
 * They are paths rather than absolute URL literals so the shipped bundle names exactly one external host, once:
 * the Tower origin behind the egress policy. App Review Preflight's "External API Calls" evidence sat on the
 * former absolute policy URLs, which are anchors and never requests.
 */
const CODALYN_PUBLIC_PAGE_PATHS = {
  privacy: "/privacy",
  terms: "/terms",
  /** Public Beacon documentation (setup, CMS Slots, custom-code removal). */
  docs: "/docs",
} as const;

export type CodalynPublicPage = keyof typeof CODALYN_PUBLIC_PAGE_PATHS;

/** `rel` for every external link the extension renders: no opener handle, no referrer leak. */
export const CODALYN_EXTERNAL_LINK_REL = "noopener noreferrer";

export type CodalynPolicyLinkProps = {
  href: string;
  target: "_blank";
  rel: typeof CODALYN_EXTERNAL_LINK_REL;
};

/** Absolute URL of a public Codalyn page on the build's Tower origin. */
function codalynPublicPageUrl(page: CodalynPublicPage): string {
  return `${readBeaconTowerOrigin()}${CODALYN_PUBLIC_PAGE_PATHS[page]}`;
}

/**
 * Anchor props for a public Codalyn page. Rendered as a plain `<a target="_blank">` (via `Button asChild`
 * / `DropdownMenuItem asChild`) rather than `window.open`: the browser handles the navigation as an ordinary
 * user-initiated link, the extension holds no handle to the opened document, and no script-spawned window
 * exists for App Review Preflight's "Prohibited Popups" rule to flag. Only accepts a page key — the
 * extension never navigates to a URL it did not author.
 */
export function codalynPolicyLinkProps(page: CodalynPublicPage): CodalynPolicyLinkProps {
  return { href: codalynPublicPageUrl(page), target: "_blank", rel: CODALYN_EXTERNAL_LINK_REL };
}
