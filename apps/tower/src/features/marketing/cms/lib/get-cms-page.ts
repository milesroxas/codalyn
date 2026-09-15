import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import { applyLimitTokens } from "@/features/marketing/cms/lib/limit-tokens";
import type { Page } from "@/payload-types";
import { getTowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { CMS_CACHE_REVALIDATE_SECONDS, CMS_PAGES_CACHE_TAG, cmsPageCacheTag } from "@/shared/lib/cms/cache-tags";
import { isValidTowerCmsPageSlug } from "@/shared/lib/navigation/tower-marketing-paths";

type GetCmsPageOptions = {
  /** Next.js draft mode — returns the latest draft version and bypasses the published-only gate. */
  draft: boolean;
};

async function findPageBySlug(slug: string, draft: boolean): Promise<Page | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "pages",
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: { slug: { equals: slug } },
  });
  return result.docs[0] ?? null;
}

/**
 * Published reads go through the Next.js Data Cache, keyed per slug and purged
 * by the Payload `pages` hooks on publish/unpublish/delete. A `null` (no such
 * page) is cached too, so unknown slugs don't hit the database either.
 */
function findPublishedPageBySlugCached(slug: string): Promise<Page | null> {
  return unstable_cache(() => findPageBySlug(slug, false), ["cms-page-by-slug", slug], {
    tags: [CMS_PAGES_CACHE_TAG, cmsPageCacheTag(slug)],
    revalidate: CMS_CACHE_REVALIDATE_SECONDS,
  })();
}

/**
 * Resolve `{{limits.*}}` tokens against the operator-configured platform
 * limits so marketing copy (pricing cards, compare tables) never hardcodes
 * numbers that drift from enforcement. Runs outside the page cache: the raw
 * CMS document is what gets cached, and the limits snapshot is read fresh on
 * every request so operator edits show immediately.
 */
async function resolvePageLimitTokens(page: Page | null): Promise<Page | null> {
  if (!page) {
    return null;
  }
  return applyLimitTokens(page, await getTowerLimitsSnapshot());
}

/**
 * Fetch a CMS marketing page by slug via the Payload Local API, with limit
 * tokens resolved. Every screen that renders a CMS page reads through here, so
 * token resolution never depends on which shell (marketing vs authenticated)
 * ends up rendering it.
 *
 * Anonymous reads stay behind collection access control (`overrideAccess: false`),
 * so only published documents come back outside draft mode.
 *
 * Draft mode (editors previewing) reads live and lets errors surface. Published
 * reads are cached and degrade to `null` when the CMS is unreachable, so a
 * database outage renders the built-in/static fallback instead of a 500.
 */
export async function getCmsPageBySlug(slug: string, { draft }: GetCmsPageOptions): Promise<Page | null> {
  if (!isValidTowerCmsPageSlug(slug)) {
    return null;
  }

  if (draft) {
    return resolvePageLimitTokens(await findPageBySlug(slug, true));
  }

  try {
    return await resolvePageLimitTokens(await findPublishedPageBySlugCached(slug));
  } catch (error) {
    console.error(`[cms] failed to load page "${slug}", treating as unpublished`, error);
    return null;
  }
}
