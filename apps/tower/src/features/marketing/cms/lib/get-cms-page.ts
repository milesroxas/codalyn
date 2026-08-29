import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import type { Page } from "@/payload-types";
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
 * Fetch a CMS marketing page by slug via the Payload Local API.
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
    return findPageBySlug(slug, true);
  }

  try {
    return await findPublishedPageBySlugCached(slug);
  } catch (error) {
    console.error(`[cms] failed to load page "${slug}", treating as unpublished`, error);
    return null;
  }
}
