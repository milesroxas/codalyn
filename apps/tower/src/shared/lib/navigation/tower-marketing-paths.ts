export const TOWER_TERMS_PATH = "/terms";
export const TOWER_PRIVACY_PATH = "/privacy";
export const TOWER_PRODUCT_MARKETING_PATH = "/tower";
export const TOWER_SUPPORT_PATH = "/support";
export const TOWER_DOCS_PATH = "/docs";
/** Alias route that permanently redirects to {@link TOWER_DOCS_PATH}. */
export const TOWER_HELP_PATH = "/help";

/** Legacy URL namespace for CMS-managed marketing pages; now permanently redirects to the root slug. */
export const TOWER_CMS_PAGE_PATH_PREFIX = "/p";

/** Kebab-case slug as stored in the Payload `pages` collection. */
const CMS_PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTowerCmsPageSlug(slug: string): boolean {
  return CMS_PAGE_SLUG_PATTERN.test(slug);
}

/** Canonical URL for a CMS marketing page: the bare slug at the site root. */
export function towerCmsPagePath(slug: string): string {
  return `/${slug}`;
}

/** Any path under the legacy `/p/` CMS namespace; slug validity is enforced at the data layer, not routing. */
export function isLegacyTowerCmsPagePath(pathname: string): boolean {
  return (
    pathname.startsWith(`${TOWER_CMS_PAGE_PATH_PREFIX}/`) && pathname.length > TOWER_CMS_PAGE_PATH_PREFIX.length + 1
  );
}

/**
 * First path segments owned by app/static routes. A root-level path whose
 * first segment is listed here can never be a CMS page — keep in sync with
 * the top-level directories under `src/app` (plus `admin`/`api`).
 */
export const TOWER_RESERVED_ROOT_SEGMENTS = new Set([
  "account",
  "admin",
  "api",
  "auth",
  "beacon",
  "billing",
  "connection",
  "console",
  "dashboard",
  "docs",
  "flint",
  "forgot-password",
  "help",
  "integrations",
  "invitations",
  "p",
  "privacy",
  "request-access",
  "reset-password",
  "sign-in",
  "sign-up",
  "support",
  "team",
  "terms",
  "tower",
  "verify-email",
]);

/**
 * A root-level path that may resolve to a CMS page (Payload `pages`
 * collection), e.g. `/spring-launch`: exactly one segment, valid slug, and
 * not a reserved app/static segment. Existence is decided by the route's
 * data lookup, not here.
 */
export function isTowerCmsRootPagePath(pathname: string): boolean {
  if (!pathname.startsWith("/")) {
    return false;
  }
  const slug = pathname.slice(1);
  return isValidTowerCmsPageSlug(slug) && !TOWER_RESERVED_ROOT_SEGMENTS.has(slug);
}

/** Any path that may serve a CMS page: canonical root slug or legacy `/p/` namespace. */
export function isTowerCmsPagePath(pathname: string): boolean {
  return isTowerCmsRootPagePath(pathname) || isLegacyTowerCmsPagePath(pathname);
}

/** Paths served on the marketing host (codalyn.app) without redirecting to the Tower app host. */
export const TOWER_MARKETING_PUBLIC_PATHS = [
  "/",
  TOWER_PRODUCT_MARKETING_PATH,
  "/beacon",
  "/flint",
  TOWER_SUPPORT_PATH,
  TOWER_TERMS_PATH,
  TOWER_PRIVACY_PATH,
  TOWER_DOCS_PATH,
  TOWER_HELP_PATH,
] as const;

export type TowerMarketingPublicPath = (typeof TOWER_MARKETING_PUBLIC_PATHS)[number];

/** Marketing pages that render their own `TowerPublicHeader` (no logged-out app chrome). */
export const TOWER_MARKETING_SELF_CONTAINED_PATHS = ["/", TOWER_PRODUCT_MARKETING_PATH, "/beacon", "/flint"] as const;

export type TowerMarketingSelfContainedPath = (typeof TOWER_MARKETING_SELF_CONTAINED_PATHS)[number];

/** Logged-out marketing inner pages that use app header chrome (for example legal). */
export const TOWER_MARKETING_INNER_PAGE_PATHS = [TOWER_TERMS_PATH, TOWER_PRIVACY_PATH, TOWER_DOCS_PATH] as const;

export type TowerMarketingInnerPagePath = (typeof TOWER_MARKETING_INNER_PAGE_PATHS)[number];

function normalizePathname(pathname: string): string {
  return pathname === "" ? "/" : pathname;
}

export function isTowerMarketingPublicPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return TOWER_MARKETING_PUBLIC_PATHS.some((path) => normalized === path) || isTowerCmsPagePath(normalized);
}

export function isTowerMarketingSelfContainedPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return TOWER_MARKETING_SELF_CONTAINED_PATHS.some((path) => normalized === path);
}

export function isTowerMarketingInnerPagePath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return TOWER_MARKETING_INNER_PAGE_PATHS.some((path) => normalized === path) || isTowerCmsPagePath(normalized);
}

/** Public marketing/legal pages that render `TowerPublicFooter`. */
export const TOWER_PUBLIC_FOOTER_PATHS = [
  ...TOWER_MARKETING_SELF_CONTAINED_PATHS,
  TOWER_TERMS_PATH,
  TOWER_PRIVACY_PATH,
  TOWER_DOCS_PATH,
] as const;

export function isTowerPublicFooterPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return TOWER_PUBLIC_FOOTER_PATHS.some((path) => normalized === path) || isTowerCmsPagePath(normalized);
}
