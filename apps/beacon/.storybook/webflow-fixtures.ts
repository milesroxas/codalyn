/**
 * Canned Designer objects for feature-level stories.
 *
 * These are deliberately shallow: each fixture implements only the methods the storied screens
 * actually call (grep before extending). Anything a fixture doesn't implement falls through to
 * the logging null-stub in `webflow-stub.ts`, so a missing method shows up as a console line —
 * add it here when a story visibly needs it, not before.
 */
import type { WebflowStoryOverrides } from "./webflow-stub";

export type FakePageKind = "static" | "cms";

/** Minimal `Page` stand-in: `getKind()` drives `useCmsCollectionTemplatePage`. */
export function fakePage(kind: FakePageKind = "static"): Page {
  const name = kind === "cms" ? "Blog Posts Template" : "Home";
  return {
    id: `page-${kind}`,
    getKind: async () => kind,
    getName: async () => name,
    getSlug: async () => (kind === "cms" ? "detail_blog-posts" : "home"),
    isDraft: async () => false,
    isHomepage: async () => kind === "static",
  } as unknown as Page;
}

/** Matches `AUTHORIZED_SITES` in `tower-mock.ts` so the site-link gate authorizes it. */
export const FAKE_SITE_INFO = {
  siteId: "site-marketing",
  siteName: "Acme Marketing",
  shortName: "acme-marketing",
};

/**
 * Baseline Designer scene every app-shell story gets: a current page and a site identity.
 * Spread story-specific overrides on top via `beaconScreen(persona, { webflow: {...} })`.
 */
export function designerScene(page: Page = fakePage()): WebflowStoryOverrides {
  return {
    getCurrentPage: async () => page,
    getSiteInfo: async () => FAKE_SITE_INFO,
    getCurrentMode: async () => "design",
  };
}
