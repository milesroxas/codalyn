export const TOWER_TERMS_PATH = "/terms";
export const TOWER_PRIVACY_PATH = "/privacy";
export const TOWER_PRODUCT_MARKETING_PATH = "/tower";
export const TOWER_SUPPORT_PATH = "/support";

/** Paths served on the marketing host (codalyn.app) without redirecting to the Tower app host. */
export const TOWER_MARKETING_PUBLIC_PATHS = [
  "/",
  TOWER_PRODUCT_MARKETING_PATH,
  "/beacon",
  "/flint",
  TOWER_SUPPORT_PATH,
  TOWER_TERMS_PATH,
  TOWER_PRIVACY_PATH,
] as const;

export type TowerMarketingPublicPath = (typeof TOWER_MARKETING_PUBLIC_PATHS)[number];

/** Marketing pages that render their own `TowerPublicHeader` (no logged-out app chrome). */
export const TOWER_MARKETING_SELF_CONTAINED_PATHS = ["/", TOWER_PRODUCT_MARKETING_PATH, "/beacon", "/flint"] as const;

export type TowerMarketingSelfContainedPath = (typeof TOWER_MARKETING_SELF_CONTAINED_PATHS)[number];

/** Logged-out marketing inner pages that use app header chrome (for example legal). */
export const TOWER_MARKETING_INNER_PAGE_PATHS = [TOWER_TERMS_PATH, TOWER_PRIVACY_PATH] as const;

export type TowerMarketingInnerPagePath = (typeof TOWER_MARKETING_INNER_PAGE_PATHS)[number];

function normalizePathname(pathname: string): string {
  return pathname === "" ? "/" : pathname;
}

export function isTowerMarketingPublicPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return TOWER_MARKETING_PUBLIC_PATHS.some((path) => normalized === path);
}

export function isTowerMarketingSelfContainedPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return TOWER_MARKETING_SELF_CONTAINED_PATHS.some((path) => normalized === path);
}

export function isTowerMarketingInnerPagePath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return TOWER_MARKETING_INNER_PAGE_PATHS.some((path) => normalized === path);
}

/** Public marketing/legal pages that render `TowerPublicFooter`. */
export const TOWER_PUBLIC_FOOTER_PATHS = [
  ...TOWER_MARKETING_SELF_CONTAINED_PATHS,
  TOWER_TERMS_PATH,
  TOWER_PRIVACY_PATH,
] as const;

export function isTowerPublicFooterPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return TOWER_PUBLIC_FOOTER_PATHS.some((path) => normalized === path);
}
