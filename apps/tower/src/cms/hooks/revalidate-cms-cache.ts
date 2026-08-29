import { revalidateTag } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from "payload";
import type { Page } from "@/payload-types";
import { CMS_HEADER_CACHE_TAG, CMS_PAGES_CACHE_TAG, cmsPageCacheTag } from "@/shared/lib/cms/cache-tags";

/**
 * Purge Next.js Data Cache entries for CMS reads.
 *
 * `revalidateTag` only works inside a Next request scope. Payload CLI runs
 * (migrations, seed scripts) invoke the same hooks outside one, so a failure is
 * logged and swallowed — those entries simply expire after
 * `CMS_CACHE_REVALIDATE_SECONDS`.
 */
export function revalidateCmsTags(tags: readonly string[], req: PayloadRequest): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag);
    } catch (error) {
      req.payload.logger.warn({ err: error, tag }, "[cms] cache revalidation skipped (outside Next request scope)");
    }
  }
}

function isPublished(doc: Pick<Page, "_status"> | null | undefined): boolean {
  return doc?._status === "published";
}

function pageTags(slug: string): string[] {
  return [CMS_PAGES_CACHE_TAG, cmsPageCacheTag(slug)];
}

/**
 * Pages: purge on publish, on unpublish, and when a published page's slug
 * changes (both the old and new slug entries). Draft-only saves of a page that
 * was never published touch nothing.
 */
export const revalidateCmsPageAfterChange: CollectionAfterChangeHook<Page> = ({ doc, previousDoc, req, context }) => {
  if (context?.disableRevalidate) {
    return doc;
  }

  const tags = new Set<string>();
  if (isPublished(doc)) {
    for (const tag of pageTags(doc.slug)) tags.add(tag);
  }
  if (isPublished(previousDoc) && (!isPublished(doc) || previousDoc.slug !== doc.slug)) {
    for (const tag of pageTags(previousDoc.slug)) tags.add(tag);
  }

  if (tags.size > 0) {
    revalidateCmsTags([...tags], req);
  }
  return doc;
};

export const revalidateCmsPageAfterDelete: CollectionAfterDeleteHook<Page> = ({ doc, req, context }) => {
  if (context?.disableRevalidate) {
    return doc;
  }
  revalidateCmsTags(pageTags(doc.slug), req);
  return doc;
};

/** Header global: a single cache entry, purged on every save. */
export const revalidateCmsHeaderAfterChange: GlobalAfterChangeHook = ({ doc, req, context }) => {
  if (context?.disableRevalidate) {
    return doc;
  }
  revalidateCmsTags([CMS_HEADER_CACHE_TAG], req);
  return doc;
};
