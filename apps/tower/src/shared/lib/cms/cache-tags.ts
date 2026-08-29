/**
 * Next.js Data Cache tags for CMS reads (header global, published pages).
 *
 * Marketing traffic must not open a Postgres connection per request: on Neon's
 * scale-to-zero compute, any steady trickle of uncached CMS reads (uptime
 * monitors, crawlers) keeps the database awake 24/7 and burns the whole monthly
 * compute quota. Reads are cached under these tags and purged by Payload hooks
 * on publish, so a change is visible immediately while idle traffic never
 * touches the database.
 */

export const CMS_HEADER_CACHE_TAG = "cms:header";
export const CMS_PAGES_CACHE_TAG = "cms:pages";

/**
 * Upper bound on staleness if a revalidation hook never runs (seconds). Tag
 * purges make publishes instant; this only catches hooks that were skipped
 * (e.g. edits made through a CLI script outside a Next request scope).
 */
export const CMS_CACHE_REVALIDATE_SECONDS = 15 * 60;

export function cmsPageCacheTag(slug: string): string {
  return `cms:page:${slug}`;
}
