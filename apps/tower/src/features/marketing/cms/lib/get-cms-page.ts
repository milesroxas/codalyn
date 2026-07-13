import config from "@payload-config";
import { getPayload } from "payload";
import type { Media, Page } from "@/payload-types";
import { isValidTowerCmsPageSlug } from "@/shared/lib/navigation/tower-marketing-paths";

type GetCmsPageOptions = {
  /** Next.js draft mode — returns the latest draft version and bypasses the published-only gate. */
  draft: boolean;
};

/**
 * Fetch a CMS marketing page by slug via the Payload Local API.
 * Anonymous reads stay behind collection access control (`overrideAccess: false`),
 * so only published documents come back outside draft mode.
 */
export async function getCmsPageBySlug(slug: string, { draft }: GetCmsPageOptions): Promise<Page | null> {
  if (!isValidTowerCmsPageSlug(slug)) {
    return null;
  }

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
 * Boundary normalizer for upload relation values: Payload returns a populated
 * `Media` object at depth > 0 but a bare numeric id at depth 0 — only the
 * populated shape carries a usable URL.
 */
export function resolveCmsMedia(value: number | Media | null | undefined): Media | null {
  if (!value || typeof value === "number") {
    return null;
  }
  return typeof value.url === "string" && value.url.length > 0 ? value : null;
}
